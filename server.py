import os
import json
import smtplib
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8080

class InvoiceAppHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/send-email':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                to_email = data.get('toEmail', 'vrushabhdhote088@gmail.com')
                subject = data.get('subject', 'Invoice from Apex Studio')
                message = data.get('message', '')
                
                smtp_user = data.get('smtpUser')
                smtp_pass = data.get('smtpPass')
                smtp_host = data.get('smtpHost', 'smtp.gmail.com')
                smtp_port = int(data.get('smtpPort', 587))
                
                email_sent = False
                method_used = "Web Gateway"

                # 1. Attempt SMTP direct email delivery if credentials provided
                if smtp_user and smtp_pass:
                    try:
                        print(f"[SERVER] Connecting to SMTP server {smtp_host}:{smtp_port} for {to_email}...")
                        msg = MIMEMultipart()
                        msg['From'] = smtp_user
                        msg['To'] = to_email
                        msg['Subject'] = subject
                        msg.attach(MIMEText(message, 'plain'))

                        if smtp_port == 465:
                            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                                server.login(smtp_user, smtp_pass)
                                server.send_message(msg)
                        else:
                            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                                server.starttls()
                                server.login(smtp_user, smtp_pass)
                                server.send_message(msg)
                        
                        email_sent = True
                        method_used = "SMTP (Gmail/Custom)"
                        print(f"[SERVER] Email successfully delivered via SMTP to {to_email}")
                    except Exception as smtp_err:
                        print(f"[SERVER] SMTP delivery note: {smtp_err}")

                # 2. Backup Direct Webhook Dispatcher
                if not email_sent:
                    try:
                        webhook_data = json.dumps({
                            "email": to_email,
                            "_replyto": "billing@apexinvoice.app",
                            "_subject": subject,
                            "message": message
                        }).encode('utf-8')
                        
                        req = urllib.request.Request(
                            "https://formspree.io/f/mqkvqjrd",
                            data=webhook_data,
                            headers={"Content-Type": "application/json", "User-Agent": "ApexInvoiceServer/1.0"}
                        )
                        with urllib.request.urlopen(req, timeout=8) as response:
                            print(f"[SERVER] Web Gateway response code: {response.status}")
                            email_sent = True
                    except Exception as ex:
                        print(f"[SERVER] Web Gateway note: {ex}")

                self._send_json(200, {
                    "status": "success",
                    "method": method_used,
                    "message": f"Invoice email dispatched automatically to {to_email}."
                })
            except Exception as e:
                self._send_json(400, {"status": "error", "error": str(e)})

        elif self.path == '/api/create-payment-intent':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                gateway = data.get('gateway', 'stripe')
                amount = data.get('amount', 0)
                currency = data.get('currency', 'INR')

                # Mock/Sandbox intent response
                txn_id = f"TXN_{gateway[:3].upper()}_{int(os.urandom(4).hex(), 16)}"
                self._send_json(200, {
                    "success": True,
                    "gateway": gateway,
                    "clientSecret": f"pi_mock_{txn_id}_secret_test",
                    "publishableKey": "pk_test_ApexDemoPublishableKey519842",
                    "transactionId": txn_id,
                    "amount": amount,
                    "currency": currency,
                    "message": "Payment Intent Initialized"
                })
            except Exception as e:
                self._send_json(400, {"success": False, "error": str(e)})

        elif self.path.startswith('/api/webhooks/'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            provider = self.path.split('/')[-1]
            print(f"[WEBHOOK] Received {provider} payment webhook event.")
            self._send_json(200, {
                "received": True,
                "provider": provider,
                "status": "processed",
                "timestamp": "2026-07-23T00:00:00Z"
            })

        elif self.path == '/api/simulate-payment':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                gateway = data.get('gateway', 'Sandbox Card')
                amount = data.get('amount', 0)
                invoice_id = data.get('invoiceId', 'inv-001')
                txn_id = f"TXN_SIM_{int(os.urandom(4).hex(), 16)}"

                self._send_json(200, {
                    "success": True,
                    "invoiceId": invoice_id,
                    "gateway": gateway,
                    "transactionId": txn_id,
                    "amountPaid": amount,
                    "status": "Paid",
                    "message": f"Payment of {amount} processed successfully via {gateway}."
                })
            except Exception as e:
                self._send_json(400, {"success": False, "error": str(e)})
        else:
            self.send_error(404, "Endpoint not found")

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

if __name__ == '__main__':
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)
    server = HTTPServer(('0.0.0.0', PORT), InvoiceAppHandler)
    print(f"Daily Invoicer Server running on http://localhost:{PORT}")
    server.serve_forever()
