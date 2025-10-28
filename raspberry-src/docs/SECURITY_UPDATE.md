# Security Update: User Authentication for Detections

## Overview
The detection system has been updated to require user authentication. All detections must now be associated with a specific user account for improved security and data privacy.

## Changes Made
1. **Database RLS Policies**: Updated to ensure users can only view their own detections
2. **API Authentication**: `submit-detection` endpoint now requires user authentication via Authorization header
3. **Data Privacy**: Removed public access to detection data with NULL user_id

## Required Python Script Update

To continue sending detections from the Raspberry Pi, you need to update the `yolo_detect.py` script to include user authentication.

### Step 1: Add User Token Environment Variable

Add the following to your `pi-env.sh` file:

```bash
export RASPBERRY_PI_USER_TOKEN="your_user_auth_token_here"
```

To get your user token:
1. Log in to the web dashboard
2. Open browser developer tools (F12)
3. Go to Application/Storage → Local Storage
4. Find the Supabase auth token and copy the `access_token` value

### Step 2: Update yolo_detect.py

Modify the detection sending logic to include the Authorization header.

Find the section where the detection is sent (around line 600-700), and update the headers:

```python
# Get user token from environment
USER_TOKEN = os.getenv("RASPBERRY_PI_USER_TOKEN")

# When sending detection, include Authorization header
headers = {
    "X-Raspberry-Pi-Key": API_KEY,
    "Content-Type": "application/json",
}

# Add Authorization header if user token is available
if USER_TOKEN:
    headers["Authorization"] = f"Bearer {USER_TOKEN}"

# Make the request
response = self.session.post(
    ENDPOINT,
    json=payload,
    headers=headers,
    timeout=30
)
```

### Step 3: Restart the Service

After making these changes:

```bash
# Source the updated environment
source ~/pi-env.sh

# Restart the detection service
sudo systemctl restart yolo-detection
# or if running manually:
python3 yolo_detect.py
```

## Important Notes

- **All detections now require a user**: Detections without a valid user token will be rejected
- **Each user sees only their own data**: Users can only view and interact with their own detections
- **Superadmins have full access**: Users with superadmin role can view all detections
- **Token expiration**: User tokens expire after some time. You may need to refresh the token periodically

## Troubleshooting

### Error: "Unauthorized" or 401 status
- Check that `RASPBERRY_PI_USER_TOKEN` is set correctly
- Verify the token is valid and not expired
- Re-login to the dashboard to get a fresh token

### Error: "Invalid Raspberry Pi API key" or 403 status
- Check that `RASPBERRY_PI_API_KEY` is still set correctly
- This is different from the user token

### Detections not appearing in dashboard
- Verify you're logged in as the same user whose token is used by the Pi
- Check the edge function logs in the Lovable Cloud backend

## Security Benefits

This update provides:
- **Data Privacy**: Users can only see their own plant detection data
- **Access Control**: Proper authentication prevents unauthorized access
- **Audit Trail**: All detections are linked to specific user accounts
- **IoT Security**: Device data is no longer publicly accessible
