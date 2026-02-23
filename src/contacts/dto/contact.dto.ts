import { IsInt } from 'class-validator';

export class CreateContactDto {
    @IsInt()
    ownerId: number;

    @IsInt()
    contactId: number;
}
