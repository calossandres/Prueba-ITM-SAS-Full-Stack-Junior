import { Body, ConflictException, Controller, Delete, Inject, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService, UPLOAD_LIMIT } from './images.service';
import { RequestDto, StatusDto } from './dto';
@Controller('requests')
export class ImagesController {
  constructor(@Inject(ImagesService) private readonly images: ImagesService) {}
  @Post()
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: UPLOAD_LIMIT, files: 1, fields: 5, fieldSize: 22000 } }))
  create(@UploadedFile() image: Express.Multer.File | undefined, @Body() data: RequestDto) {
    return this.images.create(data, image);
  }
  @Patch(':id/status')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: UPLOAD_LIMIT, files: 1, fields: 3, fieldSize: 8500 } }))
  status(@Param('id', new ParseUUIDPipe()) id: string, @UploadedFile() image: Express.Multer.File | undefined, @Body() data: StatusDto) {
    return this.images.changeStatus(id, data, image);
  }
  // Explicitly reject old clients that still try to replace/delete the original.
  @Post(':id/image')
  replaceOriginal(@Param('id', new ParseUUIDPipe()) id: string): never {
    throw new ConflictException('La imagen del problema se conserva como evidencia y no puede reemplazarse.');
  }
  @Delete(':id/image')
  removeOriginal(@Param('id', new ParseUUIDPipe()) id: string): never {
    throw new ConflictException('La imagen del problema se conserva como evidencia y no puede eliminarse.');
  }
}
