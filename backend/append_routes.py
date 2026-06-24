import re

def append_routes():
    file_path = r'h:\NextZen_main\backend\routes.py'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if "def get_holidays" in content:
        print("Routes already exist")
        return

    new_routes = """
    # --- HOLIDAYS & OFF WEEKDAYS ROUTES ---

    @app.route('/api/admin/settings/off-weekdays', methods=['GET', 'PUT', 'OPTIONS'])
    @jwt_required()
    def manage_off_weekdays():
        if request.method == 'OPTIONS':
            return make_response('', 200)
            
        try:
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized'}), 403

            db = get_db()
            
            if request.method == 'GET':
                setting = db.settings.find_one({'key': 'off_weekdays'})
                # Default to Saturday (5) and Sunday (6)
                off_weekdays = setting.get('value', [5, 6]) if setting else [5, 6]
                return jsonify({'off_weekdays': off_weekdays}), 200
                
            elif request.method == 'PUT':
                data = request.json
                off_weekdays = data.get('off_weekdays', [])
                
                db.settings.update_one(
                    {'key': 'off_weekdays'},
                    {'$set': {'value': off_weekdays}},
                    upsert=True
                )
                return jsonify({'success': True, 'message': 'Off weekdays updated'}), 200

        except Exception as e:
            current_app.logger.error(f"Error in off-weekdays: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/admin/holidays', methods=['GET', 'POST', 'OPTIONS'])
    @jwt_required()
    def manage_holidays():
        if request.method == 'OPTIONS':
            return make_response('', 200)
            
        try:
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized'}), 403

            db = get_db()
            
            if request.method == 'GET':
                holidays = list(db.holidays.find().sort('date', 1))
                for h in holidays:
                    h['_id'] = str(h['_id'])
                return jsonify(holidays), 200
                
            elif request.method == 'POST':
                data = request.json
                date_str = data.get('date')
                name = data.get('name')
                
                if not date_str or not name:
                    return jsonify({'error': 'Date and name are required'}), 400
                    
                new_holiday = {
                    'date': date_str,
                    'name': name,
                    'created_at': datetime.datetime.now()
                }
                
                # Check if exists
                if db.holidays.find_one({'date': date_str}):
                    return jsonify({'error': 'Holiday for this date already exists'}), 400
                    
                result = db.holidays.insert_one(new_holiday)
                new_holiday['_id'] = str(result.inserted_id)
                
                return jsonify({'success': True, 'holiday': new_holiday}), 201

        except Exception as e:
            current_app.logger.error(f"Error in holidays: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/admin/holidays/<holiday_id>', methods=['DELETE', 'OPTIONS'])
    @jwt_required()
    def delete_holiday(holiday_id):
        if request.method == 'OPTIONS':
            return make_response('', 200)
            
        try:
            admin_id = get_jwt_identity()
            admin = User.find_by_id(admin_id)
            if not admin or admin['role'] != 'admin':
                return jsonify({'error': 'Unauthorized'}), 403

            db = get_db()
            result = db.holidays.delete_one({'_id': ObjectId(holiday_id)})
            
            if result.deleted_count == 0:
                return jsonify({'error': 'Holiday not found'}), 404
                
            return jsonify({'success': True, 'message': 'Holiday deleted'}), 200

        except Exception as e:
            current_app.logger.error(f"Error deleting holiday: {str(e)}")
            return jsonify({'error': str(e)}), 500
"""

    content += "\n" + new_routes
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Routes appended successfully.")

if __name__ == '__main__':
    append_routes()
