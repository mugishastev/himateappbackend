import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: this.configService.get<number>('SMTP_PORT'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });
    }

    async sendOtpEmail(email: string, otp: string) {
        const mailOptions = {
            from: `"Himate Team" <${this.configService.get<string>('SMTP_USER')}>`,
            to: email,
            subject: 'Your Himate Verification Code',
            text: `Your OTP for email verification is: ${otp}. It will expire in 10 minutes.`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4A90E2;">Himate Verification</h2>
          <p>Welcome to Himate! Please use the following code to verify your email address:</p>
          <div style="font-size: 24px; font-weight: bold; padding: 10px; background-color: #f4f4f4; text-align: center; border-radius: 5px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${email}`);
        } catch (error: any) {
            console.error('[MailService] Error sending OTP email:', error.message || error);
            console.log(`\n==================================================`);
            console.log(`[FALLBACK] OTP for ${email}: ${otp}`);
            console.log(`==================================================\n`);
            // Do NOT throw — the OTP is already stored in Redis/memory.
            // The user can still verify via the code logged above or
            // once SMTP credentials are refreshed, future emails will send normally.
        }
    }

    async sendAppealConfirmationEmail(email: string, username: string) {
        const mailOptions = {
            from: `"Himate Support" <${this.configService.get<string>('SMTP_USER')}>`,
            to: email,
            subject: 'Himate Account Suspension Appeal Received',
            text: `Hi ${username || 'User'}, we are sorry for your account. We think our system will help you to get back online early. Stay patiently.`,
            html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #F97316; font-size: 28px; font-weight: 800; margin: 0; font-family: system-ui, sans-serif;">Himate</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Safety & Support Desk</p>
          </div>
          
          <div style="padding: 20px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
            <p style="font-size: 16px; color: #1e293b; font-weight: 600; margin-top: 0;">Hi ${username || 'User'},</p>
            
            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
              We are sorry for your account. We think our system will help you to get back online early. Stay patiently.
            </p>
            
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #c2410c; font-weight: 500;">
                Our Safety Administration Team has successfully received your statement. We are actively reviewing the details.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
              Ticket status updates and resolution notifications will be sent directly to this email address. You do not need to submit multiple requests.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0;">&copy; 2026 Himate. All rights reserved.</p>
            <p style="margin: 4px 0 0 0;">This is an automated support confirmation. Please do not reply directly to this message.</p>
          </div>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Appeal confirmation email sent to ${email}`);
        } catch (error) {
            console.error('Error sending appeal email:', error);
        }
    }

    async sendUnbanNotificationEmail(email: string, username: string) {
        const mailOptions = {
            from: `"Himate Support" <${this.configService.get<string>('SMTP_USER')}>`,
            to: email,
            subject: 'Himate Account Restrictions Lifted - Welcome Back!',
            text: `Hi ${username || 'User'}, we are pleased to inform you that your Himate account is back online. We sincerely apologize for any mistake or inconvenience this suspension has caused you. Thank you for your patience!`,
            html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4ade80; font-size: 28px; font-weight: 800; margin: 0; font-family: system-ui, sans-serif;">Himate</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Account Status Restored</p>
          </div>
          
          <div style="padding: 20px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
            <p style="font-size: 16px; color: #1e293b; font-weight: 600; margin-top: 0;">Hi ${username || 'User'},</p>
            
            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
              We are pleased to inform you that your Himate account is <strong>back online and fully active</strong>. 
            </p>

            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
              Our safety administration team has successfully resolved the restriction. We sincerely apologize for any mistake or inconvenience this suspension has caused you. 
            </p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #4ade80; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 500;">
                All premium messaging channels, audio/video calling, status stories, and group features are now completely accessible.
              </p>
            </div>

            <div style="text-align: center; margin: 28px 0 16px 0;">
              <a href="http://localhost:5173/login" style="background-color: #F97316; color: #ffffff; padding: 12px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.2); transition: all 0.2s;">
                Log In To Your Account
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
              Thank you for being part of the Himate family. If you experience any technical difficulties logging back in, please let us know.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0;">&copy; 2026 Himate. All rights reserved.</p>
          </div>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Unban notification email sent to ${email}`);
        } catch (error) {
            console.error('Error sending unban notification email:', error);
        }
    }
}
