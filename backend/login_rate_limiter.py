import hashlib
import hmac
import threading
import time
from collections import OrderedDict, deque


class LoginRateLimiter:
    """Process-local limiter; multi-worker deployments need shared storage."""

    def __init__(self, *, limit=5, window_seconds=900, max_buckets=10000,
                 clock=time.monotonic, key_secret=b"login-rate-limit"):
        self.limit = limit
        self.window_seconds = window_seconds
        self.max_buckets = max_buckets
        self.clock = clock
        self.key_secret = key_secret
        self._buckets = OrderedDict()
        self._lock = threading.Lock()

    def key(self, client_host, role, identifier):
        normalized = (identifier or "").strip().lower().encode("utf-8")
        fingerprint = hmac.new(
            self.key_secret, normalized, hashlib.sha256
        ).hexdigest()
        return (client_host or "unknown", role or "unknown", fingerprint)

    def _prune(self, now):
        cutoff = now - self.window_seconds
        stale = []
        for key, attempts in self._buckets.items():
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()
            if not attempts:
                stale.append(key)
        for key in stale:
            self._buckets.pop(key, None)
        while len(self._buckets) > self.max_buckets:
            self._buckets.popitem(last=False)

    def retry_after(self, key):
        now = self.clock()
        with self._lock:
            self._prune(now)
            attempts = self._buckets.get(key)
            if not attempts or len(attempts) < self.limit:
                return 0
            return max(1, int(attempts[0] + self.window_seconds - now + 0.999))

    def record_failure(self, key):
        now = self.clock()
        with self._lock:
            self._prune(now)
            attempts = self._buckets.setdefault(key, deque())
            attempts.append(now)
            self._buckets.move_to_end(key)
            self._prune(now)

    def clear(self, key):
        with self._lock:
            self._buckets.pop(key, None)

    def reset(self):
        with self._lock:
            self._buckets.clear()


login_rate_limiter = LoginRateLimiter()
