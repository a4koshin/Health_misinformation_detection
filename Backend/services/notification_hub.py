"""In-process pub/sub so connected clients get notifications within seconds."""

from __future__ import annotations

from collections import defaultdict
from queue import Empty, Full, Queue
from threading import Lock
from typing import Any


_lock = Lock()
_subscribers: dict[int, list[Queue]] = defaultdict(list)


def subscribe(user_id: int) -> Queue:
    queue: Queue = Queue(maxsize=64)
    with _lock:
        _subscribers[int(user_id)].append(queue)
    return queue


def unsubscribe(user_id: int, queue: Queue) -> None:
    uid = int(user_id)
    with _lock:
        buckets = _subscribers.get(uid) or []
        if queue in buckets:
            buckets.remove(queue)
        if not buckets and uid in _subscribers:
            del _subscribers[uid]


def publish(user_id: int, payload: dict[str, Any] | None = None) -> None:
    message = payload or {"type": "refresh"}
    with _lock:
        queues = list(_subscribers.get(int(user_id), []))
    for queue in queues:
        try:
            queue.put_nowait(message)
        except Full:
            try:
                queue.get_nowait()
            except Empty:
                pass
            try:
                queue.put_nowait(message)
            except Full:
                pass


def publish_many(user_ids: list[int] | set[int], payload: dict[str, Any] | None = None) -> None:
    for user_id in {int(uid) for uid in user_ids if uid is not None}:
        publish(user_id, payload)
