import { handleDeleteDevice, handlePutDevice } from "@/server/pushServer";

export function PUT(request: Request) {
  return handlePutDevice(request);
}

export function DELETE(request: Request) {
  return handleDeleteDevice(request);
}
