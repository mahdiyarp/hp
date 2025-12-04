import pytest
import os
import sys

# Add backend to path to find modules
sys.path.insert(0, os.path.abspath('../backend'))

# Change to backend directory
os.chdir('../backend')

# Run pytest
exit_code = pytest.main()

# Exit with the same code as pytest
sys.exit(exit_code)
