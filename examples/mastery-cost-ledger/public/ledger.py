"""Request-cost ledger. Values are decimal dollars; bill each request in cents."""
import csv
from decimal import Decimal, ROUND_HALF_UP


def total_cents(path):
    with open(path, newline="", encoding="utf-8") as source:
        rows = csv.DictReader(source)
        # Seeded bug: the contract bills each request before summing.
        total = sum((Decimal(row["units"]) * Decimal(row["dollars_per_unit"])
                     for row in rows), Decimal(0))
    return int((total * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
