"""Deterministic reviewer checks, separate from learner distributions."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from ledger import total_cents


class PrivateChecks(unittest.TestCase):
    def test_unseen_boundary_and_exact_decimal(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "check.csv"
            path.write_text("request_id,units,dollars_per_unit\nx,1,0.015\ny,1,0.015\nz,10,0.001\n", encoding="utf-8")
            self.assertEqual(total_cents(path), 5)
