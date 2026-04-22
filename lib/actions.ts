"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

type StudentMutationResult =
  | { ok: true }
  | { ok: false; error: "required" | "duplicate" };

function normalizeStudentName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
}

async function findDuplicateStudentName(
  classId: string,
  name: string,
  excludeStudentId?: string
) {
  const students = await prisma.student.findMany({
    where: {
      classId,
      ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
    },
    select: { id: true, name: true },
  });

  const normalizedName = normalizeStudentName(name);

  return students.find(
    (student) => normalizeStudentName(student.name) === normalizedName
  );
}

export async function createStudentInClass(
  classId: string,
  name: string
): Promise<StudentMutationResult> {
  const trimmedName = name.trim().replace(/\s+/g, " ");

  if (!trimmedName) {
    return { ok: false, error: "required" };
  }

  const duplicate = await findDuplicateStudentName(classId, trimmedName);
  if (duplicate) {
    return { ok: false, error: "duplicate" };
  }

  await prisma.student.create({ data: { name: trimmedName, classId } });
  revalidatePath(`/classes/${classId}`);

  return { ok: true };
}

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

export async function updateClass(id: string, name: string) {
  if (!name?.trim()) return;
  await prisma.class.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/");
  revalidatePath(`/classes/${id}`);
}

export async function deleteClass(id: string) {
  await prisma.class.delete({ where: { id } });
  revalidatePath("/");
}

// ─── Subject actions ───

export async function getAllSubjectNames() {
  const subjects = await prisma.subject.findMany({
    select: { name: true, coefficient: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
  });
  return subjects.map((s) => ({ name: s.name, coefficient: s.coefficient }));
}

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

export async function addSubjectsBatch(
  classId: string,
  subjects: { name: string; coefficient: number }[]
) {
  if (!classId || subjects.length === 0) return;
  await prisma.subject.createMany({
    data: subjects.map((s) => ({
      name: s.name.trim(),
      coefficient: s.coefficient,
      classId,
    })),
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
  return createStudentInClass(classId, name);
}

export async function updateStudent(id: string, classId: string, name: string) {
  const trimmedName = name.trim().replace(/\s+/g, " ");

  if (!trimmedName) {
    return { ok: false, error: "required" } satisfies StudentMutationResult;
  }

  const duplicate = await findDuplicateStudentName(classId, trimmedName, id);
  if (duplicate) {
    return { ok: false, error: "duplicate" } satisfies StudentMutationResult;
  }

  await prisma.student.update({ where: { id }, data: { name: trimmedName } });
  revalidatePath(`/classes/${classId}`);

  return { ok: true } satisfies StudentMutationResult;
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
      class: {
        include: {
          subjects: true,
          students: {
            include: { grades: true },
          },
        },
      },
      grades: { include: { subject: true } },
    },
  });
  return student;
}

// ─── Bulletin print status ───

export async function toggleBulletinPrinted(studentId: string, classId: string, printed: boolean) {
  await prisma.student.update({
    where: { id: studentId },
    data: { bulletinPrinted: printed },
  });
  revalidatePath(`/classes/${classId}/bulletins`);
}

export async function markBulletinsPrinted(studentIds: string[], classId: string) {
  await prisma.student.updateMany({
    where: { id: { in: studentIds } },
    data: { bulletinPrinted: true },
  });
  revalidatePath(`/classes/${classId}/bulletins`);
}

export async function getClassBulletinData(classId: string) {
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
