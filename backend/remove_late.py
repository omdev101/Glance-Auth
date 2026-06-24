import os
import re

def process_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content, flags=re.MULTILINE)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')

# backend/routes.py
backend_routes = r'h:\NextZen_main\backend\routes.py'
routes_replacements = [
    (r'\s*late_count = sum\(1 for record in (formatted_records|attendance_records) if record\.get\(\'status\'\) == \'late\'\)', ''),
    (r'\s*late_count = sum\(day\[\'late\'\] for day in daily_attendance_trend\)', ''),
    (r'\(present_count \+ late_count\)', '(present_count)'),
    (r'\s*\'late\': late_count,', ''),
    (r'\'late\': 0,', ''),
    (r'\'late\': late,', ''),
    (r'\s*late = 0', ''),
    (r'\s*late = data\[\'late\'\]', ''),
    (r'\s*late = date_data\[\'late\'\]', ''),
    (r' - late', ''),
    (r'\+ late', ''),
    (r'\s*weekly_attendance\[week_key\]\[\'late\'\] \+= day_data\[\'late\'\]', ''),
    (r'\'present\': 0, \'late\': 0', '\'present\': 0'),
    (r'\[\'present\', \'late\'\]', '[\'present\']'),
]
process_file(backend_routes, routes_replacements)

# backend/update_routes_for_holidays.py
update_replacements = [
    (r'\s*\'late\': 0,?', ''),
    (r'\'late\': late,?', ''),
    (r'\s*late = [^\n]*\n', '\n'),
    (r'\+ late', ''),
    (r'\[\'present\', \'late\'\]', '[\'present\']'),
    (r'\s*late_count = [^\n]*\n', '\n'),
    (r'\s*\'late_count\': late_count,', ''),
    (r'\s*\'late\': late_count,', ''),
    (r'\(present_count \+ late_count\)', '(present_count)')
]
process_file(r'h:\NextZen_main\backend\update_routes_for_holidays.py', update_replacements)

print('Done cleaning up backend.')
