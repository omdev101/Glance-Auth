import re

def fix_student_attendance_logic():
    file_path = r'h:\NextZen_main\backend\routes.py'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to replace the logic in three functions:
    # 1. get_student_attendance
    # 2. get_student_attendance_details
    # 3. get_student_attendance_details_plural
    
    # Let's find the block to replace in get_student_attendance_details
    # We want to replace everything from "        calendar_days = []" to "        return (jsonify(mongo_to_json(response_data)), 200)"
    
    # Wait, get_student_attendance and the others have slightly different response formats.
    # We need to carefully replace the logic to compute working days, absents, holidays, and total.

    # First, let's create a reusable snippet for the new logic
    shared_logic = """
        # Fetch holidays and off-weekdays
        db = get_db()
        holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})
        holiday_dates = {h['date']: h['name'] for h in holidays_cursor}
        
        off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})
        off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]

        calendar_days = []
        current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
        today_date = datetime.datetime.now().date()
        
        attendance_by_date = {record.get('date', ''): record for record in attendance_records if 'date' in record}
        
        working_days_count = 0
        present_count = 0
        late_count = 0
        absent_count = 0
        holiday_count = 0
        
        while current_date <= end_date_obj:
            date_str = current_date.strftime('%Y-%m-%d')
            is_past_or_today = current_date.date() <= today_date
            weekday = current_date.weekday()
            
            is_holiday = date_str in holiday_dates
            is_off_day = weekday in off_weekdays
            
            status = 'unknown'
            has_records = date_str in attendance_by_date
            
            if has_records:
                status = attendance_by_date[date_str].get('status', 'unknown')
                if status == 'present':
                    present_count += 1
                elif status == 'late':
                    late_count += 1
                elif status == 'absent':
                    absent_count += 1
                working_days_count += 1
            elif is_holiday or is_off_day:
                if is_past_or_today or is_holiday:
                    status = 'holiday'
                    holiday_count += 1
            elif is_past_or_today:
                status = 'absent'
                absent_count += 1
                working_days_count += 1
                
            calendar_days.append({
                'date': date_str, 
                'day': current_date.day, 
                'weekday': current_date.strftime('%a'), 
                'status': status,
                'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)
            })
            current_date += datetime.timedelta(days=1)
            
        attendance_percentage = 0
        if working_days_count > 0:
            attendance_percentage = round((present_count + late_count) / working_days_count * 100, 1)
"""

    # We will define a function to replace the old logic inside a given source chunk
    def replace_logic(source, func_name, response_dict_str):
        # We look for the part where it initializes calendar_days and calculates stats
        pattern = re.compile(
            r'(\s*calendar_days = \[\].*?)'
            r'(response_data = \{[^\n]*\})',
            re.DOTALL
        )
        match = pattern.search(source)
        if match:
            # We construct the new logic block with proper indentation
            indent = "        " # 8 spaces
            new_block = shared_logic.replace('\n', '\n' + indent)
            new_block = "\n" + new_block.strip() + "\n" + indent + response_dict_str + "\n"
            
            # Since the response_dict might vary, we pass it dynamically
            # Wait, the response data in get_student_attendance_details looks like:
            # response_data = {'student': ... 'statistics': {'total_days': working_days_count, 'present': present_count, 'late': late_count, 'absent': absent_count, 'holiday': holiday_count, 'percentage': attendance_percentage}, 'month': month, 'year': year}
            return source[:match.start()] + new_block + source[match.end():]
        return source

    # Wait, it's easier to just do a precise string replacement for get_student_attendance_details
    target_pattern = re.compile(
        r'(\s*calendar_days = \[\].*?attendance_percentage = round[^\n]*\n\s*response_data = \{[^\}]*\}[\s\S]*?\}[\s\S]*?\})',
        re.DOTALL
    )

    # We can write a specific python regex for the three functions
    # Let's just find the text blocks and replace them.
    # It's better to just write the specific replacements for the two functions.
    
    # Replacement for get_student_attendance_details and get_student_attendance_details_plural
    old_details_pattern = re.compile(
        r'        calendar_days = \[\].*?response_data = \{.*?\'year\': year\}',
        re.DOTALL
    )

    def details_replacement(match):
        return """        # Fetch holidays and off-weekdays
        db = get_db()
        holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})
        holiday_dates = {h['date']: h['name'] for h in holidays_cursor}
        
        off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})
        off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]

        calendar_days = []
        current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
        today_date = datetime.datetime.now().date()
        
        attendance_by_date = {record.get('date', ''): record for record in attendance_records if 'date' in record}
        
        working_days_count = 0
        present_count = 0
        late_count = 0
        absent_count = 0
        holiday_count = 0
        
        while current_date <= end_date_obj:
            date_str = current_date.strftime('%Y-%m-%d')
            is_past_or_today = current_date.date() <= today_date
            weekday = current_date.weekday()
            
            is_holiday = date_str in holiday_dates
            is_off_day = weekday in off_weekdays
            
            status = 'unknown'
            has_records = date_str in attendance_by_date
            
            if has_records:
                status = attendance_by_date[date_str].get('status', 'unknown')
                if status == 'present':
                    present_count += 1
                elif status == 'late':
                    late_count += 1
                elif status == 'absent':
                    absent_count += 1
                working_days_count += 1
            elif is_holiday or is_off_day:
                if is_past_or_today or is_holiday:
                    status = 'holiday'
                    holiday_count += 1
            elif is_past_or_today:
                status = 'absent'
                absent_count += 1
                working_days_count += 1
                
            calendar_days.append({
                'date': date_str, 
                'day': current_date.day, 
                'weekday': current_date.strftime('%a'), 
                'status': status,
                'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)
            })
            current_date += datetime.timedelta(days=1)
            
        attendance_percentage = 0
        if working_days_count > 0:
            attendance_percentage = round(((present_count + late_count) / working_days_count) * 100, 1)
            
        response_data = {
            'student': {
                '_id': str(student['_id']),
                'name': student['name'],
                'email': student['email'],
                'registration_number': profile.get('registration_number', 'Unknown') if profile else 'Unknown',
                'profile_photo': profile.get('profile_photo', None) if profile else None
            },
            'records': formatted_records,
            'calendar': calendar_days,
            'statistics': {
                'total_days': working_days_count,
                'present': present_count,
                'late': late_count,
                'absent': absent_count,
                'holiday': holiday_count,
                'percentage': attendance_percentage
            },
            'month': month,
            'year': year
        }"""
        
    content = old_details_pattern.sub(details_replacement, content)
    
    # Replacement for get_student_attendance
    old_student_pattern = re.compile(
        r'                calendar_days = \[\].*?response_data = \{.*?\'year\': year\}',
        re.DOTALL
    )
    
    def student_replacement(match):
        # same logic but indented with 16 spaces
        return """                # Fetch holidays and off-weekdays
                db = get_db()
                holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})
                holiday_dates = {h['date']: h['name'] for h in holidays_cursor}
                
                off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})
                off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]

                calendar_days = []
                current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
                end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
                today_date = datetime.datetime.now().date()
                
                attendance_by_date = {record.get('date', ''): record for record in attendance_records if 'date' in record}
                
                working_days_count = 0
                present_count = 0
                late_count = 0
                absent_count = 0
                holiday_count = 0
                
                while current_date <= end_date_obj:
                    date_str = current_date.strftime('%Y-%m-%d')
                    is_past_or_today = current_date.date() <= today_date
                    weekday = current_date.weekday()
                    
                    is_holiday = date_str in holiday_dates
                    is_off_day = weekday in off_weekdays
                    
                    status = 'unknown'
                    has_records = date_str in attendance_by_date
                    
                    if has_records:
                        status = attendance_by_date[date_str].get('status', 'unknown')
                        if status == 'present':
                            present_count += 1
                        elif status == 'late':
                            late_count += 1
                        elif status == 'absent':
                            absent_count += 1
                        working_days_count += 1
                    elif is_holiday or is_off_day:
                        if is_past_or_today or is_holiday:
                            status = 'holiday'
                            holiday_count += 1
                    elif is_past_or_today:
                        status = 'absent'
                        absent_count += 1
                        working_days_count += 1
                        
                    calendar_days.append({
                        'date': date_str, 
                        'day': current_date.day, 
                        'weekday': current_date.strftime('%a'), 
                        'status': status,
                        'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)
                    })
                    current_date += datetime.timedelta(days=1)
                    
                attendance_percentage = 0
                if working_days_count > 0:
                    attendance_percentage = round(((present_count + late_count) / working_days_count) * 100, 1)
                    
                response_data = {
                    'records': formatted_records,
                    'calendar': calendar_days,
                    'statistics': {
                        'total_days': working_days_count,
                        'present': present_count,
                        'late': late_count,
                        'absent': absent_count,
                        'holiday': holiday_count,
                        'percentage': attendance_percentage
                    },
                    'month': month,
                    'year': year
                }"""

    content = old_student_pattern.sub(student_replacement, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Done")

if __name__ == '__main__':
    fix_student_attendance_logic()
