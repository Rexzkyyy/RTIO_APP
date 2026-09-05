"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveFormFields(eventId: string, formData: FormData) {
  const fieldIds = formData.getAll("fieldId[]") as string[];
  const fieldNames = formData.getAll("fieldName[]") as string[];
  const fieldTypes = formData.getAll("fieldType[]") as string[];
  const fieldOptions = formData.getAll("fieldOptions[]") as string[];
  const fieldRequired = formData.getAll("fieldRequired[]") as string[];

  // 1. Delete all existing fields for this event
  await prisma.eventField.deleteMany({
    where: { eventId },
  });

  // 2. Create the new fields
  const fieldsToCreate = fieldNames.map((name, idx) => ({
    eventId,
    name,
    type: fieldTypes[idx] as "TEXT" | "NUMBER" | "SELECT" | "PHONE" | "FILE",
    options: fieldOptions[idx] ? JSON.stringify(fieldOptions[idx].split(",").map(s => s.trim()).filter(Boolean)) : null,
    isRequired: fieldRequired[idx] === "true",
  }));

  if (fieldsToCreate.length > 0) {
    await prisma.eventField.createMany({
      data: fieldsToCreate,
    });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { slug: true }
  });

  if (event) {
    revalidatePath(`/event/${event.slug}`);
    revalidatePath(`/event/${event.slug}/register`);
  }
  revalidatePath("/admin/events");

  redirect("/admin/events");
}
