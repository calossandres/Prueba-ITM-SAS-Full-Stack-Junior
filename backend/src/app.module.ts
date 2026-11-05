import { Body, Controller, Get, Inject, Module, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Database } from './database';
import { RequestsService } from './requests.service';
import { ListDto, RequestDto, StatusDto, UpdateRequestDto } from './dto';
@Controller('requests')
class RequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}
  @Get() list(@Query() query: ListDto) { return this.requests.list(query); }
  @Get(':id') detail(@Param('id', new ParseUUIDPipe()) id: string) { return this.requests.detail(id); }
  @Get(':id/history') history(@Param('id', new ParseUUIDPipe()) id: string) { return this.requests.history(id); }
  @Post() create(@Body() data: RequestDto) { return this.requests.create(data); }
  @Put(':id') update(@Param('id', new ParseUUIDPipe()) id: string, @Body() data: UpdateRequestDto) { return this.requests.update(id, data); }
  @Patch(':id/status') status(@Param('id', new ParseUUIDPipe()) id: string, @Body() data: StatusDto) { return this.requests.changeStatus(id, data); }
}
@Controller('health')
class HealthController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get() async health() { return this.db.rpc('health'); }
}
@Module({ controllers: [RequestsController, HealthController], providers: [Database, RequestsService] })
export class AppModule {}
