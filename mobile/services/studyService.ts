import { departments, splitCourseLabel, studyYears } from '@/lib/curriculum';
import { api } from '@/lib/api';

export type CourseDto = {
  id: string;
  code: string;
  name: string;
};

export type DepartmentYearDto = {
  year: number;
  courses: CourseDto[];
};

export type DepartmentDto = {
  id: string;
  name: string;
  courses_ready: boolean;
  years: DepartmentYearDto[];
};

export type StudySelectionDto = {
  department_id: string | null;
  department_name: string | null;
  years: DepartmentYearDto[];
};

export type UpdateStudyRequest = {
  department_id: string;
  course_ids: string[];
};

const emptyStudy: StudySelectionDto = {
  department_id: null,
  department_name: null,
  years: [],
};

function courseIdentity(departmentId: string, code: string) {
  return `${departmentId}:${code.replace(/\s+/g, '')}`;
}

export function catalogFallback(): DepartmentDto[] {
  return departments.map((department) => {
    if (!department.courses) {
      return { id: department.id, name: department.name, courses_ready: false, years: [] };
    }
    const years = studyYears.flatMap((year) => {
      const courses = department.courses![year].map((label) => {
        const parts = splitCourseLabel(label);
        const code = parts.code || label;
        return { id: courseIdentity(department.id, code), code, name: parts.name };
      });
      return courses.length > 0 ? [{ year, courses }] : [];
    });
    return { id: department.id, name: department.name, courses_ready: true, years };
  });
}

export async function getDepartments(): Promise<DepartmentDto[]> {
  try {
    const { data } = await api.get<DepartmentDto[]>('/api/departments');
    if (!Array.isArray(data)) return catalogFallback();
    return data;
  } catch {
    return catalogFallback();
  }
}

export async function getMyStudy(): Promise<StudySelectionDto> {
  try {
    const { data } = await api.get<StudySelectionDto>('/api/me/study');
    if (!data || typeof data !== 'object') return emptyStudy;
    return {
      department_id: typeof data.department_id === 'string' ? data.department_id : null,
      department_name: typeof data.department_name === 'string' ? data.department_name : null,
      years: Array.isArray(data.years) ? data.years : [],
    };
  } catch {
    return emptyStudy;
  }
}

export async function updateMyStudy(payload: UpdateStudyRequest) {
  const { data } = await api.put<StudySelectionDto>('/api/me/study', {
    department_id: payload.department_id,
    course_ids: payload.course_ids,
  });
  return data;
}
