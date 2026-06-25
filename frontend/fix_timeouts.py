import os
import re

def fix_timeouts():
    files_to_fix = [
        r"h:\NextZen_main\frontend\src\pages\admin\LiveAttendance.tsx",
        r"h:\NextZen_main\frontend\src\pages\admin\AddStudent.tsx",
        r"h:\NextZen_main\frontend\src\pages\student\ProfileCompletion.tsx"
    ]
    
    for filepath in files_to_fix:
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace timeout: XXXX with timeout: 60000
        new_content = re.sub(r'timeout:\s*\d+', 'timeout: 60000', content)
        
        if content != new_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed timeouts in {filepath}")

if __name__ == "__main__":
    fix_timeouts()
