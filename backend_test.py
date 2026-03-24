#!/usr/bin/env python3
"""
Backend API Testing for SOAP Notes App
Tests all API endpoints for the massage therapy SOAP notes generator
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class SOAPNotesAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.csrf_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_client_account = None
        self.test_session_id = None

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def get_csrf_token(self) -> bool:
        """Get CSRF token for protected requests"""
        try:
            response = self.session.get(f"{self.base_url}/api/csrf-token")
            if response.status_code == 200:
                data = response.json()
                self.csrf_token = data.get('csrfToken')
                if self.csrf_token:
                    self.session.headers.update({'X-CSRF-Token': self.csrf_token})
                    self.log("✅ CSRF token obtained successfully")
                    return True
            self.log("❌ Failed to get CSRF token", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ CSRF token error: {str(e)}", "ERROR")
            return False

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {}
        if headers:
            test_headers.update(headers)
        
        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    self.log(f"   Response: {response.text[:200]}")

            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return success, response_data

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            return False, {}

    def test_ai_status(self) -> bool:
        """Test AI status endpoint"""
        success, response = self.run_test(
            "AI Status Check",
            "GET",
            "/api/ai-status",
            200
        )
        if success:
            configured = response.get('configured', False)
            self.log(f"   AI Service Configured: {configured}")
        return success

    def test_clients_list(self) -> bool:
        """Test clients listing endpoint"""
        success, response = self.run_test(
            "Clients List",
            "GET", 
            "/api/clients",
            200
        )
        if success:
            clients = response.get('clients', [])
            pagination = response.get('pagination', {})
            self.log(f"   Found {len(clients)} clients")
            self.log(f"   Pagination: {pagination}")
        return success

    def test_create_client(self) -> bool:
        """Test client creation"""
        test_client_data = {
            "firstName": "Test",
            "lastName": "Client",
            "email": f"test.client.{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "0400123456",
            "dob": "1990-01-01",
            "chiefComplaint": "Lower back pain for testing",
            "medications": "None",
            "source": "api-test"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "/api/clients",
            201,
            data=test_client_data
        )
        
        if success:
            self.test_client_account = response.get('accountNumber')
            self.log(f"   Created client with account: {self.test_client_account}")
        
        return success

    def test_get_client(self) -> bool:
        """Test getting specific client"""
        if not self.test_client_account:
            self.log("❌ No test client account available", "ERROR")
            return False
            
        success, response = self.run_test(
            "Get Client Details",
            "GET",
            f"/api/clients/{self.test_client_account}",
            200
        )
        
        if success:
            client_name = f"{response.get('firstName', '')} {response.get('lastName', '')}".strip()
            self.log(f"   Retrieved client: {client_name}")
        
        return success

    def test_create_session(self) -> bool:
        """Test session creation"""
        if not self.test_client_account:
            self.log("❌ No test client account available", "ERROR")
            return False
            
        session_data = {
            "sessionDate": datetime.now().strftime("%Y-%m-%d"),
            "duration": "60 min",
            "musclesTreated": ["Upper Trapezius", "Lower Back"],
            "musclesToFollowUp": ["Neck"],
            "techniques": ["Deep Tissue", "Trigger Point"],
            "soapNote": {
                "subjective": "Client reports lower back pain 7/10",
                "objective": "Tension noted in upper traps, limited ROM",
                "assessment": "Muscle tension due to desk work posture",
                "plan": "Continue weekly sessions, home stretches",
                "therapistNotes": "Client responded well to treatment"
            },
            "intakeSnapshot": "Test intake data for API testing",
            "therapistName": "Test Therapist",
            "therapistCredentials": "LMT",
            "painBefore": "7",
            "painAfter": "3",
            "chiefComplaint": "Lower back pain"
        }
        
        success, response = self.run_test(
            "Create Session",
            "POST",
            f"/api/clients/{self.test_client_account}/sessions",
            200,
            data=session_data
        )
        
        if success:
            self.test_session_id = response.get('sessionId')
            self.log(f"   Created session: {self.test_session_id}")
        
        return success

    def test_get_sessions(self) -> bool:
        """Test getting client sessions"""
        if not self.test_client_account:
            self.log("❌ No test client account available", "ERROR")
            return False
            
        success, response = self.run_test(
            "Get Client Sessions",
            "GET",
            f"/api/clients/{self.test_client_account}/sessions",
            200
        )
        
        if success:
            sessions = response.get('sessions', [])
            self.log(f"   Found {len(sessions)} sessions")
        
        return success

    def test_get_session_by_id(self) -> bool:
        """Test getting specific session"""
        if not self.test_session_id:
            self.log("❌ No test session ID available", "ERROR")
            return False
            
        success, response = self.run_test(
            "Get Session by ID",
            "GET",
            f"/api/sessions/{self.test_session_id}",
            200
        )
        
        if success:
            session_date = response.get('sessionDate')
            client_name = response.get('clientName')
            self.log(f"   Retrieved session for {client_name} on {session_date}")
        
        return success

    def test_generate_soap(self) -> bool:
        """Test SOAP note generation"""
        soap_data = {
            "muscles": ["Upper Trapezius", "Lower Back", "Neck"],
            "sessionSummary": "Client presented with tension in upper back and neck area. Applied deep tissue massage and trigger point therapy. Client reported significant relief.",
            "intakeData": "Client: Test Client, Age: 34, Chief Complaint: Upper back tension from desk work, Pain Level: 7/10, No contraindications"
        }
        
        success, response = self.run_test(
            "Generate SOAP Notes",
            "POST",
            "/api/generate-soap",
            200,
            data=soap_data
        )
        
        if success:
            # Check if all SOAP sections are present
            required_sections = ['subjective', 'objective', 'assessment', 'plan', 'therapistNotes']
            missing_sections = [section for section in required_sections if not response.get(section)]
            
            if missing_sections:
                self.log(f"❌ Missing SOAP sections: {missing_sections}", "ERROR")
                return False
            else:
                self.log("   All SOAP sections generated successfully")
        
        return success

    def test_update_client(self) -> bool:
        """Test client update"""
        if not self.test_client_account:
            self.log("❌ No test client account available", "ERROR")
            return False
            
        update_data = {
            "phone": "0400999888",
            "medications": "Updated medications list"
        }
        
        success, response = self.run_test(
            "Update Client",
            "PUT",
            f"/api/clients/{self.test_client_account}",
            200,
            data=update_data
        )
        
        return success

    def test_delete_client(self) -> bool:
        """Test client deletion (cleanup)"""
        if not self.test_client_account:
            self.log("❌ No test client account available", "ERROR")
            return False
            
        success, response = self.run_test(
            "Delete Client",
            "DELETE",
            f"/api/clients/{self.test_client_account}",
            200
        )
        
        if success:
            sessions_deleted = response.get('sessionsDeleted', 0)
            self.log(f"   Deleted client and {sessions_deleted} sessions")
        
        return success

    def run_all_tests(self) -> int:
        """Run all API tests"""
        self.log("🚀 Starting SOAP Notes API Tests")
        self.log(f"   Base URL: {self.base_url}")
        
        # Get CSRF token first
        if not self.get_csrf_token():
            self.log("❌ Failed to get CSRF token, some tests may fail", "WARNING")
        
        # Test sequence
        test_methods = [
            self.test_ai_status,
            self.test_clients_list,
            self.test_create_client,
            self.test_get_client,
            self.test_create_session,
            self.test_get_sessions,
            self.test_get_session_by_id,
            self.test_generate_soap,
            self.test_update_client,
            self.test_delete_client
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log(f"❌ Test {test_method.__name__} failed with exception: {str(e)}", "ERROR")
        
        # Print results
        self.log("\n" + "="*50)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"   Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return 0
        else:
            self.log(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = SOAPNotesAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())