import re

def fix_registration_logic():
    file_path = r'h:\NextZen_main\backend\routes.py'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Student Individual Routes
    # Both `get_student_attendance` and `get_student_attendance_details` have the same loop structure
    
    student_loop_pattern = re.compile(
        r'(        working_days_count = 0\s+present_count = 0[\s\S]*?while current_date <= end_date_obj:[\s\S]*?working_days_count > 0:[\s\S]*?attendance_percentage = round[^\n]*)',
        re.DOTALL
    )

    def student_replacement(match):
        # The logic we inject before the while loop
        new_logic = """        # Get registration date
        registration_date = student.get('created_at')
        if isinstance(registration_date, str):
            try:
                import dateutil.parser
                registration_date = dateutil.parser.parse(registration_date).date()
            except:
                registration_date = datetime.date.min
        elif isinstance(registration_date, datetime.datetime):
            registration_date = registration_date.date()
        else:
            registration_date = datetime.date.min
            
        working_days_count = 0
        present_count = 0
        late_count = 0
        absent_count = 0
        holiday_count = 0
        
        while current_date <= end_date_obj:
            date_str = current_date.strftime('%Y-%m-%d')
            is_past_or_today = current_date.date() <= today_date
            is_before_registration = current_date.date() < registration_date
            weekday = current_date.weekday()
            
            is_holiday = date_str in holiday_dates
            is_off_day = weekday in off_weekdays
            
            status = 'unknown'
            has_records = date_str in attendance_by_date
            
            if is_before_registration:
                status = 'not_enrolled'
            elif has_records:
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
            attendance_percentage = round(((present_count + late_count) / working_days_count) * 100, 1)"""
        
        # Adjust indentation based on matched group. The match could be indented 8 spaces or 16 spaces.
        # We need to preserve the original indentation dynamically.
        # It's better to just replace the whole body for both functions exactly.
        return match.group(0) # fallback

    # Actually, let's just do a string replace since we know the exact code from `fix_student_logic.py`.
    
    old_loop_logic_1 = """        working_days_count = 0
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
            current_date += datetime.timedelta(days=1)"""
            
    new_loop_logic_1 = """        # Get registration date
        registration_date = student.get('created_at')
        if isinstance(registration_date, str):
            try:
                import dateutil.parser
                registration_date = dateutil.parser.parse(registration_date).date()
            except:
                registration_date = datetime.date.min
        elif isinstance(registration_date, datetime.datetime):
            registration_date = registration_date.date()
        else:
            registration_date = datetime.date.min
            
        working_days_count = 0
        present_count = 0
        late_count = 0
        absent_count = 0
        holiday_count = 0
        
        while current_date <= end_date_obj:
            date_str = current_date.strftime('%Y-%m-%d')
            is_past_or_today = current_date.date() <= today_date
            is_before_registration = current_date.date() < registration_date
            weekday = current_date.weekday()
            
            is_holiday = date_str in holiday_dates
            is_off_day = weekday in off_weekdays
            
            status = 'unknown'
            has_records = date_str in attendance_by_date
            
            if is_before_registration:
                status = 'not_enrolled'
            elif has_records:
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
            current_date += datetime.timedelta(days=1)"""
            
    content = content.replace(old_loop_logic_1, new_loop_logic_1)
    
    # Also replace for get_student_attendance which is indented by 16 spaces instead of 8
    old_loop_logic_2 = old_loop_logic_1.replace("        ", "                ")
    new_loop_logic_2 = new_loop_logic_1.replace("        ", "                ")
    content = content.replace(old_loop_logic_2, new_loop_logic_2)

    # 2. Update Admin Monthly Summary Route
    # Look for the while current_date <= end_date_obj: loop in get_monthly_attendance_summary
    
    monthly_summary_pattern = re.compile(
        r'(            working_days_count = 0\s+while current_date <= end_date_obj:[\s\S]*?current_date \+= datetime\.timedelta\(days=1\))',
        re.DOTALL
    )

    monthly_replacement = """            # Collect registration dates for all students
            student_reg_dates = []
            for s in students:
                reg_date = s.get('created_at')
                if isinstance(reg_date, str):
                    try:
                        import dateutil.parser
                        reg_date = dateutil.parser.parse(reg_date).date()
                    except:
                        reg_date = datetime.date.min
                elif isinstance(reg_date, datetime.datetime):
                    reg_date = reg_date.date()
                else:
                    reg_date = datetime.date.min
                student_reg_dates.append(reg_date)
                
            working_days_count = 0
            
            while current_date <= end_date_obj:
                date_str = current_date.strftime('%Y-%m-%d')
                is_past_or_today = current_date.date() <= today_date
                weekday = current_date.weekday()
                
                # Dynamic registered count based on student creation dates
                daily_registered_count = sum(1 for d in student_reg_dates if d <= current_date.date())
                
                is_holiday = date_str in holiday_dates
                is_off_day = weekday in off_weekdays
                
                present = 0
                absent = 0
                holiday = 0
                total = 0
                
                has_records = date_str in daily_attendance
                
                if is_holiday or (is_off_day and not has_records):
                    if is_past_or_today or is_holiday:
                        holiday = daily_registered_count
                        total = daily_registered_count
                else:
                    if has_records:
                        date_data = daily_attendance[date_str]
                        present = date_data['present']
                        absent = max(0, daily_registered_count - present)
                        total = daily_registered_count
                        working_days_count += 1
                    elif is_past_or_today:
                        absent = daily_registered_count
                        total = daily_registered_count
                        working_days_count += 1
                
                daily_attendance_trend.append({
                    'date': date_str,
                    'day': current_date.day,
                    'total': total,
                    'present': present,
                    'absent': absent,
                    'holiday': holiday,
                    'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)
                })
                
                current_date += datetime.timedelta(days=1)"""
                
    content = monthly_summary_pattern.sub(monthly_replacement, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Logic updated.")

if __name__ == '__main__':
    fix_registration_logic()
