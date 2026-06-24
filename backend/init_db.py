from models import User
from dotenv import load_dotenv
import os

def init_db():
    print("Initializing database...")
    
    # Create default admin user
    admin_email = "desaivithal28@gmail.com"
    admin_user = User.find_by_email(admin_email)
    
    if not admin_user:
        print(f"Creating admin user with email: {admin_email}")
        admin = User.create({
            "name": "Admin User",
            "email": admin_email,
            "password": "Nxtzen@123",
            "role": "admin"
        })
        
        # Verify admin email directly
        User.verify_email(admin_email)
        
        print("Admin user created successfully")
    else:
        print("Admin user already exists")

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Initialize database
    init_db() 