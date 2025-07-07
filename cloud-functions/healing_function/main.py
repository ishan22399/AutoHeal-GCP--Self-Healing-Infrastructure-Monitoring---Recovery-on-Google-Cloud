"""
AutoHeal-GCP Cloud Function
Main healing logic that responds to Pub/Sub alerts and performs recovery actions
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional

import functions_framework
from google.cloud import compute_v1
from google.cloud import run_v2
from google.cloud import logging as cloud_logging
from google.cloud import monitoring_v3
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize GCP clients
compute_client = compute_v1.InstancesClient()
cloud_run_client = run_v2.ServicesClient()
logging_client = cloud_logging.Client()
monitoring_client = monitoring_v3.AlertPolicyServiceClient()

# Configuration
PROJECT_ID = os.environ.get('GCP_PROJECT', os.environ.get('GOOGLE_CLOUD_PROJECT'))
ZONE = os.environ.get('GCP_ZONE', 'us-central1-a')
REGION = os.environ.get('GCP_REGION', 'us-central1')
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SLACK_WEBHOOK_URL = os.environ.get('SLACK_WEBHOOK_URL')
NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', 'admin@example.com')

class AutoHealEngine:
    """Main healing engine that processes alerts and executes recovery actions"""
    
    def __init__(self):
        self.recovery_actions = {
            'high_cpu': self.handle_high_cpu,
            'service_down': self.handle_service_down,
            'memory_leak': self.handle_memory_leak,
            'error_rate_spike': self.handle_error_rate_spike
        }
        
    def process_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process incoming alert and determine appropriate action"""
        try:
            alert_type = self.classify_alert(alert_data)
            resource_info = self.extract_resource_info(alert_data)
            
            logger.info(f"Processing alert: {alert_type} for resource: {resource_info}")
            
            # Execute healing action
            if alert_type in self.recovery_actions:
                result = self.recovery_actions[alert_type](resource_info, alert_data)
            else:
                result = self.handle_unknown_alert(resource_info, alert_data)
            
            # Log the action
            self.log_healing_action(alert_type, resource_info, result)
            
            # Send notification
            self.send_notification(alert_type, resource_info, result)
            
            return {
                'status': 'success',
                'alert_type': alert_type,
                'resource': resource_info,
                'action_taken': result.get('action', 'none'),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing alert: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def classify_alert(self, alert_data: Dict[str, Any]) -> str:
        """Classify the type of alert based on the data"""
        incident = alert_data.get('incident', {})
        condition_name = incident.get('condition_display_name', '').lower()
        
        if 'cpu' in condition_name:
            return 'high_cpu'
        elif 'error' in condition_name or '5xx' in condition_name:
            return 'error_rate_spike'
        elif 'memory' in condition_name:
            return 'memory_leak'
        elif 'uptime' in condition_name or 'availability' in condition_name:
            return 'service_down'
        else:
            return 'unknown'
    
    def extract_resource_info(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract resource information from alert data"""
        incident = alert_data.get('incident', {})
        resource = incident.get('resource', {})
        
        return {
            'type': resource.get('type', 'unknown'),
            'labels': resource.get('labels', {}),
            'name': resource.get('labels', {}).get('instance_name') or 
                   resource.get('labels', {}).get('service_name', 'unknown')
        }
    
    def handle_high_cpu(self, resource_info: Dict[str, Any], alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle high CPU usage alerts"""
        resource_type = resource_info.get('type')
        resource_name = resource_info.get('name')
        
        if resource_type == 'gce_instance':
            return self.restart_vm_instance(resource_name)
        elif resource_type == 'cloud_run_revision':
            return self.scale_cloud_run_service(resource_name)
        else:
            return {'action': 'alert_only', 'reason': f'Unsupported resource type: {resource_type}'}
    
    def handle_service_down(self, resource_info: Dict[str, Any], alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle service downtime alerts"""
        resource_type = resource_info.get('type')
        resource_name = resource_info.get('name')
        
        if resource_type == 'gce_instance':
            return self.restart_vm_instance(resource_name)
        elif resource_type == 'cloud_run_revision':
            return self.restart_cloud_run_service(resource_name)
        else:
            return {'action': 'alert_only', 'reason': f'Unsupported resource type: {resource_type}'}
    
    def handle_memory_leak(self, resource_info: Dict[str, Any], alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle memory leak alerts"""
        # For memory leaks, restart is often the best immediate solution
        return self.handle_service_down(resource_info, alert_data)
    
    def handle_error_rate_spike(self, resource_info: Dict[str, Any], alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle error rate spike alerts"""
        resource_type = resource_info.get('type')
        resource_name = resource_info.get('name')
        
        if resource_type == 'cloud_run_revision':
            # First try to scale up, then restart if needed
            scale_result = self.scale_cloud_run_service(resource_name)
            if scale_result.get('status') != 'success':
                return self.restart_cloud_run_service(resource_name)
            return scale_result
        else:
            return self.handle_service_down(resource_info, alert_data)
    
    def handle_unknown_alert(self, resource_info: Dict[str, Any], alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle unknown alert types"""
        return {
            'action': 'alert_only',
            'reason': 'Unknown alert type - manual intervention required',
            'alert_data': alert_data
        }
    
    def restart_vm_instance(self, instance_name: str) -> Dict[str, Any]:
        """Restart a GCE VM instance"""
        try:
            logger.info(f"Restarting VM instance: {instance_name}")
            
            # Stop the instance
            stop_request = compute_v1.StopInstanceRequest(
                project=PROJECT_ID,
                zone=ZONE,
                instance=instance_name
            )
            logger.info(f"Sending stop request for {instance_name} in zone {ZONE}")
            stop_operation = compute_client.stop(request=stop_request)
            
            # Wait for stop operation to complete
            logger.info(f"Waiting for stop operation for {instance_name}")
            self.wait_for_operation(stop_operation, 'stop', client=compute_client, project=PROJECT_ID, zone=ZONE)
            logger.info(f"Stop operation completed for {instance_name}")
            
            # Start the instance
            start_request = compute_v1.StartInstanceRequest(
                project=PROJECT_ID,
                zone=ZONE,
                instance=instance_name
            )
            logger.info(f"Sending start request for {instance_name} in zone {ZONE}")
            start_operation = compute_client.start(request=start_request)
            
            # Wait for start operation to complete
            logger.info(f"Waiting for start operation for {instance_name}")
            self.wait_for_operation(start_operation, 'start', client=compute_client, project=PROJECT_ID, zone=ZONE)
            logger.info(f"Start operation completed for {instance_name}")
            
            return {
                'action': 'vm_restart',
                'status': 'success',
                'instance': instance_name,
                'message': f'Successfully restarted VM instance {instance_name}'
            }
            
        except Exception as e:
            logger.error(f"Failed to restart VM instance {instance_name}: {str(e)}")
            return {
                'action': 'vm_restart',
                'status': 'failed',
                'instance': instance_name,
                'error': str(e)
            }
    
    def scale_cloud_run_service(self, service_name: str) -> Dict[str, Any]:
        """Scale up a Cloud Run service by increasing max instances"""
        try:
            logger.info(f"Attempting to scale Cloud Run service: {service_name}")
            
            service_path = f"projects/{PROJECT_ID}/locations/{REGION}/services/{service_name}"
            
            # Get current service configuration
            service = cloud_run_client.get_service(name=service_path)
            
            # Determine current max instances, default to a reasonable value if not set
            current_max_instances = service.template.scaling.max_instance_count or 10
            
            # Increase max instances (example: increase by 5 or set to a higher cap)
            # You might want more sophisticated logic here based on alert severity or history
            new_max_instances = min(current_max_instances + 5, 50) # Example: increase by 5, cap at 50
            
            if new_max_instances > current_max_instances:
                logger.info(f"Increasing max instances for {service_name} from {current_max_instances} to {new_max_instances}")
                
                # Create an updated service object
                updated_service = run_v2.Service()
                updated_service.name = service_path
                updated_service.template = run_v2.RevisionTemplate()
                updated_service.template.scaling = run_v2.RevisionScaling()
                updated_service.template.scaling.max_instance_count = new_max_instances
                
                # Update the service
                update_request = run_v2.UpdateServiceRequest(
                    service=updated_service,
                    update_mask="template.scaling.max_instance_count"
                )
                operation = cloud_run_client.update_service(request=update_request)
                
                # Wait for the update operation to complete
                logger.info(f"Waiting for Cloud Run update operation for {service_name}")
                # Cloud Run operations don't have a simple wait method like GCE.
                # The update_service call itself returns an LRO (Long Running Operation).
                # The client library's operation object has a .result() method.
                operation.result() # This blocks until the operation is done
                logger.info(f"Cloud Run update operation completed for {service_name}")

                return {
                    'action': 'cloud_run_scale',
                    'status': 'success',
                    'service': service_name,
                    'message': f'Successfully scaled Cloud Run service {service_name} to max instances {new_max_instances}'
                }
            else:
                 return {
                    'action': 'cloud_run_scale',
                    'status': 'skipped',
                    'service': service_name,
                    'message': f'Max instances already at or above target ({new_max_instances}) for {service_name}'
                }
            
        except Exception as e:
            logger.error(f"Failed to scale Cloud Run service {service_name}: {str(e)}")
            return {
                'action': 'cloud_run_scale',
                'status': 'failed',
                'service': service_name,
                'error': str(e)
            }
    
    def restart_cloud_run_service(self, service_name: str) -> Dict[str, Any]:
        """Restart a Cloud Run service by deploying a new revision"""
        try:
            logger.info(f"Attempting to restart Cloud Run service: {service_name}")
            
            service_path = f"projects/{PROJECT_ID}/locations/{REGION}/services/{service_name}"
            
            # Get current service configuration
            service = cloud_run_client.get_service(name=service_path)
            
            # Create a new revision template based on the current configuration
            # Add a timestamp environment variable to force a new revision deployment
            new_template = service.template
            
            # Ensure env var list exists
            if not new_template.containers[0].env:
                 new_template.containers[0].env = []

            # Add or update a timestamp env var
            timestamp_env_var_found = False
            for env_var in new_template.containers[0].env:
                if env_var.name == 'RESTART_TIMESTAMP':
                    env_var.value = datetime.utcnow().isoformat()
                    timestamp_env_var_found = True
                    break
            
            if not timestamp_env_var_found:
                 new_template.containers[0].env.append(
                     run_v2.EnvVar(name='RESTART_TIMESTAMP', value=datetime.utcnow().isoformat())
                 )

            # Create an updated service object with the new template
            updated_service = run_v2.Service()
            updated_service.name = service_path
            updated_service.template = new_template
            
            # Update the service to trigger a new revision
            update_request = run_v2.UpdateServiceRequest(
                service=updated_service,
                # Specify the update mask to only update the template
                update_mask="template" 
            )
            operation = cloud_run_client.update_service(request=update_request)
            
            # Wait for the update operation to complete
            logger.info(f"Waiting for Cloud Run update operation for {service_name}")
            operation.result() # This blocks until the operation is done
            logger.info(f"Cloud Run update operation completed for {service_name}")

            return {
                'action': 'cloud_run_restart',
                'status': 'success',
                'service': service_name,
                'message': f'Successfully initiated restart (new revision deployment) for Cloud Run service {service_name}'
            }
            
        except Exception as e:
            logger.error(f"Failed to restart Cloud Run service {service_name}: {str(e)}")
            return {
                'action': 'cloud_run_restart',
                'status': 'failed',
                'service': service_name,
                'error': str(e)
            }
    
    def wait_for_operation(self, operation, operation_type: str, client=None, project=None, zone=None, timeout: int = 300):
        """Wait for a GCP operation to complete using the client's wait method"""
        try:
            logger.info(f"Waiting for {operation_type} operation...")
            # The .result() method on the operation object returned by the client
            # blocks until the operation is complete and returns the result or raises an exception.
            # For GCE operations, you might need to explicitly poll or use a client-specific wait method
            # if .result() isn't sufficient or available on the operation object itself.
            # The compute_v1 client has a wait method for zone operations.
            if client and hasattr(client, 'wait') and project and zone and hasattr(operation, 'name'):
                 # This is specific to GCE zone operations
                 wait_request = compute_v1.WaitZoneOperationRequest(
                     operation=operation.name,
                     project=project,
                     zone=zone
                 )
                 client.wait(request=wait_request)
            elif hasattr(operation, 'result'):
                 # For LROs returned by other clients (like Cloud Run v2)
                 operation.result(timeout=timeout)
            else:
                 # Fallback or log a warning if the operation object doesn't support waiting
                 logger.warning(f"Operation object for type {operation_type} does not support standard waiting methods. Waiting manually (less reliable).")
                 import time
                 start_time = time.time()
                 # Manual polling fallback (less ideal)
                 while (time.time() - start_time) < timeout:
                     # This manual polling requires knowing how to check the operation status,
                     # which varies by service. The .result() method is preferred.
                     # If .result() isn't available, this fallback is incomplete.
                     time.sleep(5)
                 if (time.time() - start_time) >= timeout:
                     raise Exception(f"Operation {operation_type} timed out after {timeout} seconds")


            logger.info(f"{operation_type.capitalize()} operation completed.")
            
        except Exception as e:
            logger.error(f"Error waiting for operation {operation_type}: {str(e)}")
            raise # Re-raise the exception so the calling function knows it failed
    
    def log_healing_action(self, alert_type: str, resource_info: Dict[str, Any], result: Dict[str, Any]):
        """Log healing action to Cloud Logging"""
        try:
            log_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'alert_type': alert_type,
                'resource': resource_info,
                'action_result': result,
                'severity': 'INFO' if result.get('status') == 'success' else 'ERROR'
            }
            
            logger.info(f"AutoHeal Action: {json.dumps(log_entry)}")
            
        except Exception as e:
            logger.error(f"Failed to log healing action: {str(e)}")
    
    def send_notification(self, alert_type: str, resource_info: Dict[str, Any], result: Dict[str, Any]):
        """Send notification about healing action"""
        try:
            message = self.format_notification_message(alert_type, resource_info, result)
            
            # Send Slack notification if configured
            if SLACK_WEBHOOK_URL:
                self.send_slack_notification(message)
            
            # Send email notification if configured
            if SENDGRID_API_KEY and NOTIFICATION_EMAIL:
                self.send_email_notification(message, alert_type)
                
        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")
    
    def format_notification_message(self, alert_type: str, resource_info: Dict[str, Any], result: Dict[str, Any]) -> str:
        """Format notification message"""
        status_emoji = "✅" if result.get('status') == 'success' else "❌"
        
        message = f"""
{status_emoji} **AutoHeal Action Report**

**Alert Type:** {alert_type.replace('_', ' ').title()}
**Resource:** {resource_info.get('name', 'Unknown')} ({resource_info.get('type', 'Unknown')})
**Action Taken:** {result.get('action', 'None').replace('_', ' ').title()}
**Status:** {result.get('status', 'Unknown').title()}
**Timestamp:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

**Details:** {result.get('message', result.get('error', 'No additional details'))}
        """.strip()
        
        return message
    
    def send_slack_notification(self, message: str):
        """Send notification to Slack"""
        try:
            payload = {
                'text': 'AutoHeal-GCP Alert',
                'attachments': [{
                    'color': 'good',
                    'text': message,
                    'mrkdwn_in': ['text']
                }]
            }
            
            response = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=10)
            response.raise_for_status()
            
            logger.info("Slack notification sent successfully")
            
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {str(e)}")
    
    def send_email_notification(self, message: str, alert_type: str):
        """Send email notification using SendGrid"""
        if not SENDGRID_API_KEY or not NOTIFICATION_EMAIL:
            logger.warning("SendGrid API key or recipient email not configured. Skipping email notification.")
            return

        try:
            logger.info(f"Attempting to send email notification to {NOTIFICATION_EMAIL}")
            
            url = "https://api.sendgrid.com/v3/mail/send"
            
            headers = {
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Assuming a sender email is also configured or hardcoded
            # Replace 'sender@example.com' with your verified SendGrid sender email
            sender_email = os.environ.get('SENDGRID_SENDER_EMAIL', 'autoheal@your-domain.com') 
            if sender_email == 'autoheal@your-domain.com':
                 logger.warning("Using default sender email. Configure SENDGRID_SENDER_EMAIL environment variable.")

            payload = {
                "personalizations": [
                    {
                        "to": [{"email": NOTIFICATION_EMAIL}],
                        "subject": f"AutoHeal-GCP Alert: {alert_type.replace('_', ' ').title()}"
                    }
                ],
                "from": {"email": sender_email},
                "content": [
                    {
                        "type": "text/plain",
                        "value": message
                    }
                ]
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
            
            logger.info("Email notification sent successfully via SendGrid")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send email notification via SendGrid: {str(e)}")
        except Exception as e:
            logger.error(f"An unexpected error occurred while sending email: {str(e)}")

# Initialize the healing engine
healing_engine = AutoHealEngine()

@functions_framework.cloud_event
def autoheal_function(cloud_event):
    """
    Cloud Function entry point for processing Pub/Sub messages
    """
    try:
        # Decode the Pub/Sub message
        import base64
        
        if 'data' in cloud_event.data:
            message_data = base64.b64decode(cloud_event.data['data']).decode('utf-8')
            alert_data = json.loads(message_data)
        else:
            alert_data = cloud_event.data
        
        logger.info(f"Received alert: {json.dumps(alert_data, indent=2)}")
        
        # Process the alert
        result = healing_engine.process_alert(alert_data)
        
        logger.info(f"Healing result: {json.dumps(result, indent=2)}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in autoheal_function: {str(e)}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

@functions_framework.http
def autoheal_http(request):
    """
    HTTP endpoint for testing and manual triggers
    """
    try:
        if request.method == 'GET':
            return {
                'status': 'healthy',
                'service': 'AutoHeal-GCP',
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0.0'
            }
        
        elif request.method == 'POST':
            alert_data = request.get_json()
            if not alert_data:
                return {'error': 'No JSON data provided'}, 400
            
            result = healing_engine.process_alert(alert_data)
            return result
        
        else:
            return {'error': 'Method not allowed'}, 405
            
    except Exception as e:
        logger.error(f"Error in autoheal_http: {str(e)}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }, 500
