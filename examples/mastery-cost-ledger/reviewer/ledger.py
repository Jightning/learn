"""Reviewer solution. Excluded from the public lab and course distributions."""
import csv
from decimal import Decimal, ROUND_HALF_UP


def total_cents(path):
    with open(path, newline="", encoding="utf-8") as source:
        return sum(int((Decimal(row["units"]) * Decimal(row["dollars_per_unit"]) * 100)
                       .quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                   for row in csv.DictReader(source))
