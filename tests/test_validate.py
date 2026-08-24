import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate.py"
SPEC = importlib.util.spec_from_file_location("ecosystem_validate", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class EcosystemContractTests(unittest.TestCase):
    def test_workspace_contracts(self):
        self.assertEqual(MODULE.validate(), [])


if __name__ == "__main__":
    unittest.main()
