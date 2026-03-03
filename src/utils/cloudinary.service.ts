import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    async uploadImage(
        file: Express.Multer.File,
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        if (!file?.buffer) {
            throw new BadRequestException('Invalid file upload payload');
        }

        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream((error, result) => {
                if (error) {
                    const message = (error as any)?.message || 'Cloudinary upload failed';
                    return reject(new BadGatewayException(message));
                }
                if (!result) return reject(new Error('Upload failed: Empty result'));
                resolve(result);
            });

            const stream = Readable.from(file.buffer);
            stream.pipe(upload);
        });
    }

    async deleteImage(publicId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(publicId, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });
    }
}
