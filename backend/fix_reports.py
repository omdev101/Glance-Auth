import re

def fix_monthly_summary():
    file_path = r'h:\NextZen_main\backend\routes.py'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # The block we want to replace starts with:
    #             # Get registered students count
    # and ends with:
    #                     'overall_attendance_rate': overall_attendance_rate
    #                 },
    
    pattern = re.compile(
        r'(\s*# Get registered students count.*?'
        r"'overall_attendance_rate': overall_attendance_rate\n\s*\},)",
        re.DOTALL
    )
    
    match = pattern.search(content)
    if not match:
        print("Could not find the target block to replace.")
        return
        
    new_logic = """            # Get registered students count
            registered_students = User.get_all_students()
            registered_count = len(registered_students)
            
            db = get_db()
            profiles = list(db.student_profiles.find({}))
            course_registered_counts = {}
            for profile in profiles:
                if 'course' in profile:
                    course = profile['course']
                    course_registered_counts[course] = course_registered_counts.get(course, 0) + 1
            
            # Query the attendance collection for all records in the month
            attendance_records = list(Attendance.collection().find({
                'date': {'$gte': start_date, '$lte': end_date}
            }))
            
            # Calculate how many unique students marked attendance
            students_with_attendance = set()
            for record in attendance_records:
                if 'student_id' in record:
                    students_with_attendance.add(str(record['student_id']))
                    
            students_with_attendance_count = len(students_with_attendance)
            
            # Group records by date
            daily_attendance = {}
            for record in attendance_records:
                date = record.get('date')
                if date:
                    if date not in daily_attendance:
                        daily_attendance[date] = {'present': 0, 'late': 0}
                    
                    status = record.get('status', 'unknown')
                    if status in ['present', 'late']:
                        daily_attendance[date][status] += 1
            
            # Format daily attendance for the chart
            daily_attendance_trend = []
            current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
            end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
            today_date = datetime.datetime.now().date()
            
            working_days_count = 0
            
            while current_date <= end_date_obj:
                date_str = current_date.strftime('%Y-%m-%d')
                is_past_or_today = current_date.date() <= today_date
                
                # Exclude weekends (Saturday=5, Sunday=6) from working days if they have no records
                # But if a user wants to see absent on 21st (Sunday), we should probably not exclude them implicitly,
                # or maybe just exclude weekends ONLY if there are no records. Let's include all past days as working days
                # to strictly match the user's request that the 21st should show absence.
                
                if date_str in daily_attendance:
                    date_data = daily_attendance[date_str]
                    present = date_data['present']
                    late = date_data['late']
                    absent = max(0, registered_count - present - late)
                    total = registered_count
                    working_days_count += 1
                elif is_past_or_today:
                    present = 0
                    late = 0
                    absent = registered_count
                    total = registered_count
                    working_days_count += 1
                else:
                    present = 0
                    late = 0
                    absent = 0
                    total = 0
                
                daily_attendance_trend.append({
                    'date': date_str,
                    'day': current_date.day,
                    'total': total,
                    'present': present,
                    'late': late,
                    'absent': absent
                })
                
                current_date += datetime.timedelta(days=1)
            
            # Calculate weekly attendance trend
            weekly_attendance = {}
            for day_data in daily_attendance_trend:
                week_num = (day_data['day'] - 1) // 7 + 1
                week_key = f"Week {week_num}"
                
                if week_key not in weekly_attendance:
                    weekly_attendance[week_key] = {'total': 0, 'present': 0, 'late': 0, 'absent': 0}
                
                weekly_attendance[week_key]['total'] += day_data['total']
                weekly_attendance[week_key]['present'] += day_data['present']
                weekly_attendance[week_key]['late'] += day_data['late'] 
                weekly_attendance[week_key]['absent'] += day_data['absent']
            
            weekly_attendance_trend = []
            for week, data in sorted(weekly_attendance.items()):
                weekly_attendance_trend.append({
                    'week': week,
                    'total': data['total'],
                    'present': data['present'],
                    'late': data['late'],
                    'absent': data['absent']
                })
            
            # Calculate course-wise attendance
            course_attendance = {}
            for record in attendance_records:
                if 'student_id' not in record:
                    continue
                
                student_id = str(record['student_id'])
                profile = next((p for p in profiles if str(p.get('user_id')) == student_id), None)
                
                if profile and 'course' in profile:
                    course = profile['course']
                    if course not in course_attendance:
                        course_attendance[course] = {'present': 0, 'late': 0}
                    
                    status = record.get('status', 'unknown')
                    if status in ['present', 'late']:
                        course_attendance[course][status] += 1
            
            course_attendance_data = []
            for course, data in course_attendance.items():
                course_total = course_registered_counts.get(course, 0) * working_days_count
                present = data['present']
                late = data['late']
                absent = max(0, course_total - present - late)
                
                attendance_rate = 0
                if course_total > 0:
                    attendance_rate = round(((present + late) / course_total) * 100, 1)
                    
                course_attendance_data.append({
                    'course': course,
                    'total': course_total,
                    'present': present,
                    'late': late,
                    'absent': absent,
                    'attendance_rate': attendance_rate
                })
            
            # Calculate overall statistics
            total_expected_attendance = working_days_count * registered_count
            present_count = sum(day['present'] for day in daily_attendance_trend)
            late_count = sum(day['late'] for day in daily_attendance_trend)
            absent_count = sum(day['absent'] for day in daily_attendance_trend)
            
            overall_attendance_rate = 0
            if total_expected_attendance > 0:
                overall_attendance_rate = round(((present_count + late_count) / total_expected_attendance) * 100, 1)
            
            # Generate the response with all summary data
            response_data = {
                'month': month,
                'year': year,
                'month_name': calendar.month_name[month],
                'overall_statistics': {
                    'registered_students': registered_count,
                    'students_with_attendance': students_with_attendance_count,
                    'total_attendance_records': total_expected_attendance,
                    'present_count': present_count,
                    'late_count': late_count,
                    'absent_count': absent_count,
                    'overall_attendance_rate': overall_attendance_rate
                },"""
        
    # Replace content
    new_content = content[:match.start()] + new_logic + content[match.end():]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully replaced logic.")

if __name__ == '__main__':
    fix_monthly_summary()
