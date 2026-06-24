import re

def apply_fixes():
    file_path = r'h:\NextZen_main\backend\routes.py'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Student UI Route (get_student_attendance)
    student_ui_pattern = re.compile(
        r'(                # Calculate attendance statistics for the month.*?current_date \+= datetime\.timedelta\(days=1\))',
        re.DOTALL
    )

    new_student_ui = """                # Get student info
                student = User.find_by_id(user_id)
                student_name = student['name'] if student else 'Unknown Student'
                
                # Create calendar days with attendance status
                calendar_days = []
                current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
                end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
                
                # Create a dictionary for fast lookup of attendance status by date
                attendance_by_date = {record['date']: record.get('status', 'unknown') for record in formatted_records}
                
                db = get_db()
                holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})
                holiday_dates = {h['date']: h['name'] for h in holidays_cursor}
                
                off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})
                off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]
                
                today_date = datetime.datetime.now().date()
                
                registration_date = student.get('created_at') if student else datetime.date.min
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
                        status = attendance_by_date[date_str]
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
                        
                    day_data = {
                        'date': date_str,
                        'day': current_date.day,
                        'weekday': current_date.strftime('%A'),
                        'status': status,
                        'holiday_name': holiday_dates.get(date_str) if is_holiday else ('Weekend' if is_off_day else None)
                    }
                    calendar_days.append(day_data)
                    current_date += datetime.timedelta(days=1)
                
                total_records = working_days_count
                attendance_percentage = 0
                if working_days_count > 0:
                    attendance_percentage = round(((present_count + late_count) / working_days_count) * 100, 1)"""

    content = student_ui_pattern.sub(new_student_ui, content, count=1)


    # 2. Update Admin Student Route (get_student_attendance_details)
    admin_student_pattern = re.compile(
        r'(            while current_date <= end_date_obj:.*?current_date \+= datetime\.timedelta\(days=1\))',
        re.DOTALL
    )

    new_admin_student = """            today_date = datetime.datetime.now().date()
            
            registration_date = student.get('created_at') if student else datetime.date.min
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
            
            db = get_db()
            holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})
            holiday_dates = {h['date']: h['name'] for h in holidays_cursor}
            
            off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})
            off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]
            
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
                
    content = admin_student_pattern.sub(new_admin_student, content, count=1)
    
    # 3. Update the overall total calculations that are static below the loop in get_student_attendance_details
    admin_totals_pattern = re.compile(
        r'(            # Calculate attendance statistics\s+total_records = len\(attendance_records\).*?attendance_percentage = round\(\(present_count\) / total_records \* 100, 1\))',
        re.DOTALL
    )
    
    new_admin_totals = """            # Calculate attendance statistics
            total_records = working_days_count
            
            # Calculate attendance percentage
            attendance_percentage = 0
            if total_records > 0:
                attendance_percentage = round(((present_count + late_count) / total_records) * 100, 1)"""
                
    content = admin_totals_pattern.sub(new_admin_totals, content, count=1)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("All routes fully updated.")

if __name__ == '__main__':
    apply_fixes()
