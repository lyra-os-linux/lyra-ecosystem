import importlib.util
import tempfile
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

    def test_rejects_missing_owner_asymmetric_distribution_and_cycles(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            (workspace / "edition").mkdir()
            (workspace / "component").mkdir()
            (workspace / "distributed").mkdir()
            catalog = {
                "schema": 1,
                "products": [
                    {
                        "id": "edition", "kind": "edition",
                        "repository": "lyra-os-linux/edition", "local_path": "edition",
                        "owner": "lyra-os-linux", "consumes": ["component"],
                        "consumed_by": ["component"],
                    },
                    {
                        "id": "component", "kind": "application",
                        "repository": "lyra-os-linux/component", "local_path": "component",
                        "consumes": ["edition"],
                    },
                    {
                        "id": "distributed", "kind": "application",
                        "repository": "lyra-os-linux/distributed", "local_path": "distributed",
                        "owner": "lyra-os-linux", "consumed_by": ["edition"],
                    },
                ],
            }
            errors = MODULE.catalog_errors(catalog, workspace)
            self.assertTrue(any("missing owner" in error for error in errors))
            self.assertTrue(any("missing reciprocal consumed_by" in error for error in errors))
            self.assertTrue(any("distributed component is not cataloged" in error for error in errors))
            self.assertTrue(any("dependency cycle" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
