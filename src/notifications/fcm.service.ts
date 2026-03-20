import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

        if (projectId && clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log('Firebase Admin initialized');
        } else {
            console.warn('Firebase configuration missing. Push notifications will be disabled.');
        }
    }

    async sendPushNotification(fcmToken: string, title: string, body: string, data?: any) {
        try {
            const message = {
                notification: { title, body },
                data: data || {},
                token: fcmToken,
            };

            await admin.messaging().send(message);
            console.log('Push notification sent successfully');
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    async sendToTopic(topic: string, title: string, body: string, data?: any) {
        try {
            const message = {
                notification: { title, body },
                data: data || {},
                topic: topic,
            };

            await admin.messaging().send(message);
            console.log(`Push notification sent to topic: ${topic}`);
        } catch (error) {
            console.error('Error sending topic notification:', error);
        }
    }

    async subscribeToTopic(tokens: string[], topic: string) {
        if (!tokens || tokens.length === 0) return;
        try {
            await admin.messaging().subscribeToTopic(tokens, topic);
            console.log(`Successfully subscribed ${tokens.length} tokens to topic: ${topic}`);
        } catch (error) {
            console.error('Error subscribing to topic:', error);
        }
    }

    async unsubscribeFromTopic(tokens: string[], topic: string) {
        if (!tokens || tokens.length === 0) return;
        try {
            await admin.messaging().unsubscribeFromTopic(tokens, topic);
            console.log(`Successfully unsubscribed ${tokens.length} tokens from topic: ${topic}`);
        } catch (error) {
            console.error('Error unsubscribing from topic:', error);
        }
    }
}
