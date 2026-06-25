import os
import glob
import re

def refactor_axios_imports():
    frontend_src = r"h:\NextZen_main\frontend\src"
    
    # Find all tsx and ts files
    files = glob.glob(os.path.join(frontend_src, '**', '*.tsx'), recursive=True)
    files.extend(glob.glob(os.path.join(frontend_src, '**', '*.ts'), recursive=True))
    
    # Files to exclude
    exclude_files = [
        os.path.join(frontend_src, 'services', 'api.ts')
    ]
    
    count = 0
    for filepath in files:
        if any(ex in filepath for ex in exclude_files):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace import axios from 'axios'; or import axios from "axios";
        if re.search(r"import axios from ['\"]axios['\"];?", content):
            new_content = re.sub(
                r"import axios from ['\"]axios['\"];?",
                "import { api as axios } from '@/services/api';",
                content
            )
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Refactored: {filepath}")
            count += 1
            
    print(f"Total files refactored: {count}")

if __name__ == "__main__":
    refactor_axios_imports()
