#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from pathlib import Path

# The dictionary is empty as the previous entries were causing errors.
# It should be populated with correct key-value pairs if needed.
CORRUPTED_TO_CORRECT = {}

def fix_file(file_path):
    if not CORRUPTED_TO_CORRECT:
        return False

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        original = content
        
        for corrupted, correct in CORRUPTED_TO_CORRECT.items():
            content = content.replace(corrupted, correct)
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
        return False

def process_directory(directory):
    fixed_count = 0
    
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build']]
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.json')):
                file_path = os.path.join(root, file)
                if fix_file(file_path):
                    print(f"? File fixed: {file_path}")
                    fixed_count += 1
    
    return fixed_count

if __name__ == '__main__':
    project_root = Path(__file__).resolve().parent.parent
    frontend_dir = project_root / 'frontend' / 'src'
    
    if not CORRUPTED_TO_CORRECT:
        print("Warning: The corrupted texts dictionary is empty. No changes will be made.")
    else:
        print(f"Starting processing directory: {frontend_dir}")
        if frontend_dir.is_dir():
            count = process_directory(str(frontend_dir))
            print(f"\nOperation finished. Total {count} files fixed.")
        else:
            print(f"Error: Directory '{frontend_dir}' not found. Searching in the entire project...")
            count = process_directory(str(project_root))
            print(f"\nOperation in the entire project finished. Total {count} files fixed.")
