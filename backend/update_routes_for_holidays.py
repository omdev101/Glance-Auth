import re

def update_routes():
    file_path = r'h:\NextZen_main\backend\routes.py'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to insert the new routes right before the get_monthly_attendance_summary function.
    # We will also modify get_monthly_attendance_summary.
    
    # 1. New routes logic
    new_routes = """
    @app.route('/api/admin/settings/off-weekdays', methods=['GET'])
    @jwt_required()
    def get_off_weekdays():
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        db = get_db()
        setting = db.settings.find_one({'key': 'off_weekdays'})
        if not setting:
            off_weekdays = [5, 6]  # Default to Saturday and Sunday
        else:
            off_weekdays = setting.get('value', [5, 6])
            
        return jsonify({'off_weekdays': off_weekdays}), 200

    @app.route('/api/admin/settings/off-weekdays', methods=['PUT'])
    @jwt_required()
    def update_off_weekdays():
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json()
        off_weekdays = data.get('off_weekdays', [])
        
        db = get_db()
        db.settings.update_one(
            {'key': 'off_weekdays'},
            {'$set': {'value': off_weekdays, 'updated_at': datetime.datetime.now()}},
            upsert=True
        )
        return jsonify({'message': 'Settings updated successfully', 'off_weekdays': off_weekdays}), 200

    @app.route('/api/admin/holidays', methods=['GET'])
    @jwt_required()
    def get_holidays():
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        db = get_db()
        holidays = list(db.holidays.find().sort('date', 1))
        
        result = []
        for h in holidays:
            result.append({
                '_id': str(h['_id']),
                'date': h['date'],
                'name': h['name']
            })
            
        return jsonify(result), 200

    @app.route('/api/admin/holidays', methods=['POST'])
    @jwt_required()
    def add_holiday():
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json()
        if not data or 'date' not in data or 'name' not in data:
            return jsonify({'error': 'Missing date or name'}), 400
            
        db = get_db()
        result = db.holidays.insert_one({
            'date': data['date'],
            'name': data['name'],
            'created_at': datetime.datetime.now()
        })
        
        return jsonify({
            'message': 'Holiday added successfully',
            'holiday': {
                '_id': str(result.inserted_id),
                'date': data['date'],
                'name': data['name']
            }
        }), 201

    @app.route('/api/admin/holidays/<holiday_id>', methods=['DELETE'])
    @jwt_required()
    def delete_holiday(holiday_id):
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        db = get_db()
        result = db.holidays.delete_one({'_id': ObjectId(holiday_id)})
        
        if result.deleted_count > 0:
            return jsonify({'message': 'Holiday deleted successfully'}), 200
        else:
            return jsonify({'error': 'Holiday not found'}), 404
"""

    # Insert new routes before get_monthly_attendance_summary
    target = r"    @app.route('/api/admin/attendance/monthly-summary', methods=\['GET'\])"
    if "def get_holidays(" not in content:
        content = re.sub(target, new_routes + r"\n    @app.route('/api/admin/attendance/monthly-summary', methods=['GET'])", content)

    # Now update the get_monthly_attendance_summary logic
    # Find the logic block for format daily attendance trend
    
    # We replace from "# Format daily attendance for the chart" up to "course_attendance_data.append" loop end or "# Calculate overall statistics"
    # Actually, let's just find the exact block from fix_reports.py and modify it to include holidays
    
    old_logic_pattern = re.compile(
        r'(\s*# Group records by date.*?'
        r"'overall_attendance_rate': overall_attendance_rate\n\s*\},)",
        re.DOTALL
    )
    
    match = old_logic_pattern.search(content)
    if not match:
        print("Could not find the target block to replace.")
        return
        
    new_logic = """            # Group records by date
            daily_attendance = {}
            for record in attendance_records:
                date = record.get('date')
                if date:
                    if date not in daily_attendance:
                        daily_attendance[date] = {'present': 0,}
                    
                    status = record.get('status', 'unknown')
                    if status in ['present']:
                        daily_attendance[date][status] += 1
                        
            # Fetch holidays and off-weekdays
            db = get_db()
            holidays_cursor = db.holidays.find({'date': {'$gte': start_date, '$lte': end_date}})
            holiday_dates = {h['date']: h['name'] for h in holidays_cursor}
            
            off_weekdays_setting = db.settings.find_one({'key': 'off_weekdays'})
            off_weekdays = off_weekdays_setting.get('value', [5, 6]) if off_weekdays_setting else [5, 6]
            
            # Format daily attendance for the chart
            daily_attendance_trend = []
            current_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
            end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
            today_date = datetime.datetime.now().date()
            
            working_days_count = 0
            
            while current_date <= end_date_obj:
                date_str = current_date.strftime('%Y-%m-%d')
                is_past_or_today = current_date.date() <= today_date
                weekday = current_date.weekday()
                
                is_holiday = date_str in holiday_dates
                is_off_day = weekday in off_weekdays
                
                present = 0
                absent = 0
                holiday = 0
                total = 0
                
                # If there are records for this date, it's counted as a working day regardless of holiday settings
                # (e.g. if students showed up anyway, or it was marked as off by mistake)
                has_records = date_str in daily_attendance
                
                if is_holiday or (is_off_day and not has_records):
                    # It's a non-working day
                    if is_past_or_today or is_holiday:
                        holiday = registered_count
                        total = registered_count
                else:
                    # It's a working day
                    if has_records:
                        date_data = daily_attendance[date_str]
                        present = date_data['present']
                        absent = max(0, registered_count - present - late)
                        total = registered_count
                        working_days_count += 1
                    elif is_past_or_today:
                        absent = registered_count
                        total = registered_count
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
                
                current_date += datetime.timedelta(days=1)
            
            # Calculate weekly attendance trend
            weekly_attendance = {}
            for day_data in daily_attendance_trend:
                week_num = (day_data['day'] - 1) // 7 + 1
                week_key = f"Week {week_num}"
                
                if week_key not in weekly_attendance:
                    weekly_attendance[week_key] = {'total': 0, 'present': 0, 'absent': 0, 'holiday': 0}
                
                weekly_attendance[week_key]['total'] += day_data['total']
                weekly_attendance[week_key]['present'] += day_data['present']
                weekly_attendance[week_key]['late'] += day_data['late'] 
                weekly_attendance[week_key]['absent'] += day_data['absent']
                weekly_attendance[week_key]['holiday'] += day_data.get('holiday', 0)
            
            weekly_attendance_trend = []
            for week, data in sorted(weekly_attendance.items()):
                weekly_attendance_trend.append({
                    'week': week,
                    'total': data['total'],
                    'present': data['present'],
                    'late': data['late'],
                    'absent': data['absent'],
                    'holiday': data['holiday']
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
                        course_attendance[course] = {'present': 0,}
                    
                    status = record.get('status', 'unknown')
                    if status in ['present']:
                        course_attendance[course][status] += 1
            
            course_attendance_data = []
            for course, data in course_attendance.items():
                course_total = course_registered_counts.get(course, 0) * working_days_count
                present = data['present']
                absent = max(0, course_total - present - late)
                
                attendance_rate = 0
                if course_total > 0:
                    attendance_rate = round(((present ) / course_total) * 100, 1)
                    
                course_attendance_data.append({
                    'course': course,
                    'total': course_total,
                    'present': present,
                    
                    'absent': absent,
                    'attendance_rate': attendance_rate
                })
            
            # Calculate overall statistics
            total_expected_attendance = working_days_count * registered_count
            present_count = sum(day['present'] for day in daily_attendance_trend)
            absent_count = sum(day['absent'] for day in daily_attendance_trend)
            
            overall_attendance_rate = 0
            if total_expected_attendance > 0:
                overall_attendance_rate = round(((present_count _count) / total_expected_attendance) * 100, 1)
            
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
                    'absent_count': absent_count,
                    'overall_attendance_rate': overall_attendance_rate
                },"""
                
    new_content = content[:match.start()] + new_logic + content[match.end():]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Routes updated successfully")

if __name__ == '__main__':
    update_routes()
