"""Shared fakes for hermetic server unit tests."""

from __future__ import annotations

from typing import Any, Iterable, Iterator, List, Optional


class FakeQuerySet:
    """
    Lightweight stand-in for mongoengine QuerySets.

    Supports count/aggregate/filter/order_by/exclude/skip/limit/as_pymongo/first/slicing.
    """

    def __init__(
        self,
        items: Optional[Iterable[Any]] = None,
        *,
        total: Optional[int] = None,
        aggregate_docs: Optional[List[Any]] = None,
        aggregate_sequence: Optional[List[List[Any]]] = None,
    ):
        self._items = list(items or [])
        self._total = total if total is not None else len(self._items)
        self._aggregate_docs = list(aggregate_docs or [])
        self._aggregate_sequence = (
            list(aggregate_sequence) if aggregate_sequence is not None else None
        )
        self._call = 0
        self._skip = 0
        self._limit: Optional[int] = None

    def count(self) -> int:
        return self._total

    def aggregate(self, _pipeline=None) -> List[Any]:
        if self._aggregate_sequence is not None:
            if self._call >= len(self._aggregate_sequence):
                docs: List[Any] = []
            else:
                docs = self._aggregate_sequence[self._call]
            self._call += 1
            return list(docs)
        return list(self._aggregate_docs)

    def filter(self, *args, **kwargs) -> "FakeQuerySet":
        return self

    def order_by(self, *args, **kwargs) -> "FakeQuerySet":
        return self

    def exclude(self, *args, **kwargs) -> "FakeQuerySet":
        return self

    def only(self, *args, **kwargs) -> "FakeQuerySet":
        return self

    def skip(self, n: int) -> "FakeQuerySet":
        self._skip = int(n)
        return self

    def limit(self, n: int) -> "FakeQuerySet":
        self._limit = int(n)
        return self

    def as_pymongo(self) -> List[Any]:
        end = None if self._limit is None else self._skip + self._limit
        sliced = self._items[self._skip : end]
        out = []
        for item in sliced:
            if isinstance(item, dict):
                out.append(item)
            elif hasattr(item, "to_mongo"):
                out.append(item.to_mongo().to_dict())
            else:
                out.append(item)
        return out

    def first(self) -> Any:
        return self._items[0] if self._items else None

    def __iter__(self) -> Iterator[Any]:
        return iter(self._items)

    def __getitem__(self, key):
        if isinstance(key, slice):
            return self._items[key]
        return self._items[key]

    def __len__(self) -> int:
        return len(self._items)
