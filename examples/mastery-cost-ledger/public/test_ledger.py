"""Public examples only: passing these never establishes private-test credit."""
from pathlib import Path
import unittest
from ledger import total_cents


class LedgerTests(unittest.TestCase):
    def test_examples(self):
        for name, expected in [("base", 2), ("fresh", 5), ("delayed", 3), ("empty", 0)]:
            with self.subTest(variant=name):
                self.assertEqual(total_cents(Path(__file__).parent / "data" / (name + ".csv")), expected)


if __name__ == "__main__":
    unittest.main()
