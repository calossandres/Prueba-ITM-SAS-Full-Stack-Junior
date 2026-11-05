import { Body, Controller, Delete, Inject, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService, UPLOAD_LIMIT } from './images.service';
import { ImageActorDto, RequestDto } from './dto';
@Controller('requests')
export class ImagesController {
    constructor(
    @Inject(ImagesService)
    private readonly images: ImagesService) { }
    @Post()
    @UseInterceptors(FileInterceptor('image', { limits: { fileSize: UPLOAD_LIMIT, files: 1, fields: 5, fieldSize: 22000 } }))
    create(
    @UploadedFile()
    image: Express.Multer.File | undefined,
    @Body()
    data: RequestDto) {
        return this.images.create(data, image);
    }
    @Post(':id/image')
    @UseInterceptors(FileInterceptor('image', { limits: { fileSize: UPLOAD_LIMIT, files: 1, fields: 1, fieldSize: 400 } }))
    upload(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @UploadedFile()
    image: Express.Multer.File | undefined,
    @Body()
    data: ImageActorDto) {
        return this.images.upload(id, image, data.actor);
    }
    @Delete(':id/image')
    remove(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @Body()
    data: ImageActorDto) {
        return this.images.remove(id, data.actor);
    }
}
