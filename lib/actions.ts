"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

// ─── Class actions ───

export async function getClasses() {
  return prisma.class.findMany({
    include: { _count: { select: { students: true, subjects: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createClass(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) return;
  await prisma.class.create({ data: { name: name.trim() } });
  revalidatePath("/");
}

export async function deleteClass(id: string) {
  await prisma.class.delete({ where: { id } });
  revalidatePath("/");
}

// ─── Subject actions ───

export async function getClassWithDetails(classId: string) {
  return prisma.class.findUnique({
    where: { id: classId },
    include: {
      subjects: { orderBy: { name: "asc" } },
      students: {
        orderBy: { name: "asc" },
        include: { grades: true },
      },
    },
  });
}

export async function addSubject(formData: FormData) {
  const classId = formData.get("classId") as string;
  const name = formData.get("name") as string;
  const coefficient = parseFloat(formData.get("coefficient") as string);
  if (!name?.trim() || isNaN(coefficient) || coefficient <= 0) return;
  await prisma.subject.create({
    data: { name: name.trim(), coefficient, classId },
  });
  revalidatePath(`/classes/${classId}`);
}

export async function deleteSubject(id: string, classId: string) {
  await prisma.subject.delete({ where: { id } });
  revalidatePath(`/classes/${classId}`);
}

export async function updateSubject(
  id: string,
  classId: string,
  name: string,
  coefficient: number
) {
  if (!name?.trim() || isNaN(coefficient) || coefficient <= 0) return;
  await prisma.subject.update({
    where: { id },
    data: { name: name.trim(), coefficient },
  });
  revalidatePath(`/classes/${classId}`);
}

// ─── Student actions ───

export async function addStudent(formData: FormData) {
  const classId = formData.get("classId") as string;
  const name = formData.get("name") as string;
  if (!name?.trim()) return;
  await prisma.student.create({ data: { name: name.trim(), classId } });
  revalidatePath(`/classes/${classId}`);
}

export async function deleteStudent(id: string, classId: string) {
  await prisma.student.delete({ where: { id } });
  revalidatePath(`/classes/${classId}`);
}

// ─── Grade actions ───

export async function saveGrade(
  studentId: string,
  subjectId: string,
  value: number,
  classId: string
) {
  if (isNaN(value) || value < 0 || value > 20) return;
  await prisma.grade.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    update: { value },
    create: { studentId, subjectId, value },
  });
  revalidatePath(`/classes/${classId}`);
}

// ─── Report data ───

export async function getStudentReport(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: { include: { subjects: true } },
      grades: { include: { subject: true } },
    },
  });
  return student;
}
