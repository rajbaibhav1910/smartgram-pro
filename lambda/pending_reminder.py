# lambda/pending_reminder.py
# AWS Lambda function — runs daily via EventBridge
# Scans DynamoDB for pending complaints → sends SNS summary email

import boto3
import os
from datetime import datetime

region = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1')

# AWS clients (Lambda automatically uses its IAM Role)
dynamodb = boto3.resource('dynamodb', region_name=region)
sns      = boto3.client('sns',        region_name=region)

TABLE_NAME    = os.environ.get('TABLE_NAME',    'SmartGramComplaints')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN', '')

def lambda_handler(event, context):
    table = dynamodb.Table(TABLE_NAME)

    # Scan for all Pending complaints with pagination support
    pending = []
    scan_kwargs = {
        'FilterExpression': boto3.dynamodb.conditions.Attr('status').eq('Pending')
    }

    done = False
    start_key = None
    while not done:
        if start_key:
            scan_kwargs['ExclusiveStartKey'] = start_key
        response = table.scan(**scan_kwargs)
        pending.extend(response.get('Items', []))
        start_key = response.get('LastEvaluatedKey', None)
        done = start_key is None

    count = len(pending)
    today = datetime.now().strftime('%Y-%m-%d')

    if count == 0:
        subject = f"SmartGram Pro: No Pending Complaints on {today}"
        body    = f"Great news! All complaints have been addressed as of {today}."
    else:
        lines = [
            f"SmartGram Pro – Daily Pending Complaints Report ({today})",
            f"Total Pending: {count}\n",
            "Complaint Details:"
        ]
        for c in pending[:50]:  # Cap at 50 in summary email to prevent message truncation
            lines.append(
                f"  • [{c.get('complaint_id', 'N/A')}] {c.get('category', 'General')} | "
                f"{c.get('village', 'Unknown')} | Filed: {str(c.get('submitted_at', ''))[:10]}"
            )
        if count > 50:
            lines.append(f"\n... and {count - 50} more pending complaints.")
        lines.append("\nPlease login to the SmartGram Pro admin panel to take action.")
        body    = '\n'.join(lines)
        subject = f"SmartGram Pro: {count} Complaint(s) Still Pending – Action Required"

    if SNS_TOPIC_ARN:
        try:
            sns.publish(TopicArn=SNS_TOPIC_ARN, Subject=subject, Message=body)
            print(f"[Lambda] {today} – Sent reminder for {count} pending complaints to {SNS_TOPIC_ARN}")
        except Exception as e:
            print(f"[Lambda] [ERROR] Failed to publish to SNS: {e}")
    else:
        print(f"[Lambda] [INFO] SNS_TOPIC_ARN not set. Report generated: {count} pending complaints.")

    return {'statusCode': 200, 'body': f'{count} pending complaints processed'}

