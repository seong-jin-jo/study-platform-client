'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/common/ui/button';
import { BaseInput, NativeSelect } from '@/components/common/ui/input';
import type {
  AdminCoursePlan,
  AdminCoursePlanUpsertRequest,
} from '@/features/admin/course-management/model/admin-course-management-contract';
import {
  useAdminCoursePlansQuery,
  useCreateAdminCoursePlanMutation,
  useDeactivateAdminCoursePlanMutation,
  useUpdateAdminCoursePlanMutation,
} from '@/features/admin/course-management/model/use-admin-course-management-query';
import { useToastStore } from '@/stores/use-toast-store';

interface PlanItemFormValue {
  label: string;
}

interface PlanFormValues {
  // planCode는 결제에 박제되는 식별 키. 화면에서 직접 입력받지 않고,
  // 신규 플랜은 저장 시 플랜명에서 자동 생성하고 기존 플랜은 그대로 유지한다.
  planCode: string;
  name: string;
  subtitle: string;
  description: string;
  regularPrice: string;
  useEarlyBird: boolean;
  discountPrice: string;
  earlyBirdEndsAt: string;
  isActive: 'true' | 'false';
  isRecommended: 'true' | 'false';
  displayOrder: number;
  items: PlanItemFormValue[];
}

const emptyPlanForm: PlanFormValues = {
  planCode: '',
  name: '',
  subtitle: '',
  description: '',
  regularPrice: '',
  useEarlyBird: false,
  discountPrice: '',
  earlyBirdEndsAt: '',
  isActive: 'true',
  isRecommended: 'false',
  displayOrder: 0,
  items: [],
};

const toDateTimeLocalValue = (value: string | null) =>
  value ? value.slice(0, 16) : '';

const toKstOffsetDateTime = (value: string) => {
  if (!value) return null;
  return `${value.length === 16 ? `${value}:00` : value}+09:00`;
};

const isDigitsOnly = (value: string) => /^\d+$/.test(value.trim());

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'plan';

// 코스 내에서 유일한 planCode 자동 생성(플랜명 기반, 충돌 시 -2, -3 ...)
const generatePlanCode = (name: string, existingCodes: string[]) => {
  const base = slugify(name);
  if (!existingCodes.includes(base)) return base;
  let suffix = 2;
  while (existingCodes.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

const toPlanFormValues = (plan: AdminCoursePlan): PlanFormValues => {
  const hasEarlyBird =
    Boolean(plan.earlyBirdEndsAt) || plan.discountPrice < plan.regularPrice;
  return {
    planCode: plan.planCode,
    name: plan.name,
    subtitle: plan.subtitle ?? '',
    description: plan.description ?? '',
    regularPrice: String(plan.regularPrice),
    useEarlyBird: hasEarlyBird,
    discountPrice: hasEarlyBird ? String(plan.discountPrice) : '',
    earlyBirdEndsAt: toDateTimeLocalValue(plan.earlyBirdEndsAt),
    isActive: plan.isActive ? 'true' : 'false',
    isRecommended: plan.isRecommended ? 'true' : 'false',
    displayOrder: plan.displayOrder,
    items: plan.items
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((item) => ({ label: item.label })),
  };
};

const parsePositivePrice = (value: string, fieldName: string) => {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (!isDigitsOnly(trimmed) || !Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}에 양수 금액을 입력해주세요.`);
  }
  return parsed;
};

const showValidationError = (error: unknown) => {
  if (error instanceof Error) {
    useToastStore.getState().showToast(error.message, 'info');
  }
};

const buildPlanPayload = (
  form: PlanFormValues,
  options: { existingCodes: string[]; displayOrder: number },
): AdminCoursePlanUpsertRequest => {
  const name = form.name.trim();
  if (!name) {
    throw new Error('플랜명을 입력해주세요.');
  }

  const regularPrice = parsePositivePrice(form.regularPrice, '정가');

  // 얼리버드 미사용 시: 정가로 판매(할인 없음), 종료일 없음.
  let discountPrice = regularPrice;
  let earlyBirdEndsAt: string | null = null;
  if (form.useEarlyBird) {
    discountPrice = parsePositivePrice(form.discountPrice, '얼리버드 할인가');
    if (discountPrice > regularPrice) {
      throw new Error('얼리버드 할인가는 정가보다 클 수 없습니다.');
    }
    earlyBirdEndsAt = toKstOffsetDateTime(form.earlyBirdEndsAt);
  }

  const items = form.items.map((item, index) => {
    const label = item.label.trim();
    if (!label) {
      throw new Error(`구성 항목 ${index + 1}의 내용을 입력해주세요.`);
    }
    return { label, displayOrder: index };
  });

  return {
    planCode:
      form.planCode.trim() || generatePlanCode(name, options.existingCodes),
    name,
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim() || null,
    regularPrice,
    discountPrice,
    earlyBirdEndsAt,
    isActive: form.isActive === 'true',
    isRecommended: form.isRecommended === 'true',
    displayOrder: options.displayOrder,
    items,
  };
};

export default function AdminCoursePlanManagement({
  courseId,
}: {
  courseId: number;
}) {
  const plansQuery = useAdminCoursePlansQuery(courseId);
  const createPlanMutation = useCreateAdminCoursePlanMutation();
  const updatePlanMutation = useUpdateAdminCoursePlanMutation();
  const deactivatePlanMutation = useDeactivateAdminCoursePlanMutation();
  const [createForm, setCreateForm] = useState<PlanFormValues>(emptyPlanForm);
  const [editForms, setEditForms] = useState<Record<number, PlanFormValues>>(
    {},
  );
  const isMutating =
    createPlanMutation.isPending ||
    updatePlanMutation.isPending ||
    deactivatePlanMutation.isPending;

  useEffect(() => {
    if (!plansQuery.data) return;
    setEditForms(
      Object.fromEntries(
        plansQuery.data.map((plan) => [plan.planId, toPlanFormValues(plan)]),
      ),
    );
  }, [plansQuery.data]);

  const activePlans = useMemo(
    () => plansQuery.data?.filter((plan) => plan.isActive) ?? [],
    [plansQuery.data],
  );

  const existingPlanCodes = useMemo(
    () => plansQuery.data?.map((plan) => plan.planCode) ?? [],
    [plansQuery.data],
  );

  const updateCreateFormField = <FieldName extends keyof PlanFormValues>(
    field: FieldName,
    value: PlanFormValues[FieldName],
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditFormField = <FieldName extends keyof PlanFormValues>(
    planId: number,
    field: FieldName,
    value: PlanFormValues[FieldName],
  ) => {
    setEditForms((prev) => ({
      ...prev,
      [planId]: { ...(prev[planId] ?? emptyPlanForm), [field]: value },
    }));
  };

  const hasRecommendedPlanConflict = (
    targetForm: PlanFormValues,
    targetPlanId?: number,
  ) => {
    if (targetForm.isRecommended !== 'true') return false;

    return (
      plansQuery.data?.some((plan) => {
        if (plan.planId === targetPlanId) return false;
        const planForm = editForms[plan.planId] ?? toPlanFormValues(plan);
        return planForm.isRecommended === 'true';
      }) ?? false
    );
  };

  const handleCreatePlan = async () => {
    if (hasRecommendedPlanConflict(createForm)) {
      useToastStore
        .getState()
        .showToast('대표 플랜은 코스당 하나만 저장할 수 있습니다.', 'info');
      return;
    }

    let request: AdminCoursePlanUpsertRequest;
    try {
      request = buildPlanPayload(createForm, {
        existingCodes: existingPlanCodes,
        displayOrder: plansQuery.data?.length ?? 0,
      });
    } catch (error) {
      showValidationError(error);
      return;
    }

    await createPlanMutation.mutateAsync({ courseId, request });
    setCreateForm(emptyPlanForm);
  };

  const handleUpdatePlan = async (planId: number) => {
    const form = editForms[planId];
    if (!form) return;

    if (hasRecommendedPlanConflict(form, planId)) {
      useToastStore
        .getState()
        .showToast('대표 플랜은 코스당 하나만 저장할 수 있습니다.', 'info');
      return;
    }

    let request: AdminCoursePlanUpsertRequest;
    try {
      request = buildPlanPayload(form, {
        existingCodes: existingPlanCodes.filter(
          (code) => code !== form.planCode,
        ),
        displayOrder: form.displayOrder,
      });
    } catch (error) {
      showValidationError(error);
      return;
    }

    await updatePlanMutation.mutateAsync({ courseId, planId, request });
  };

  return (
    <div className="border-border-default bg-background-default rounded-150 border p-200">
      <div className="mb-150 flex items-start justify-between gap-100">
        <div>
          <h2 className="font-designer-20b text-text-default">플랜 관리</h2>
          <p className="font-designer-13r text-text-subtle mt-50">
            고객 결제 화면에 보이는 플랜(가격·혜택)을 관리합니다. 플랜 코드는
            자동으로 생성돼요.
          </p>
        </div>
        <span className="font-designer-13m text-text-subtle">
          활성 플랜 {activePlans.length}개
        </span>
      </div>

      {plansQuery.isLoading ? (
        <p className="font-designer-14r text-text-subtle">
          플랜 목록을 불러오는 중입니다.
        </p>
      ) : plansQuery.isError ? (
        <p className="font-designer-14r text-text-error">
          플랜 목록을 불러오지 못했습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-150">
          {plansQuery.data?.map((plan) => (
            <PlanEditor
              key={plan.planId}
              form={editForms[plan.planId] ?? toPlanFormValues(plan)}
              isLocked={isMutating}
              title={plan.name}
              planCode={plan.planCode}
              onChange={(field, value) =>
                updateEditFormField(plan.planId, field, value)
              }
              onDeactivate={() =>
                deactivatePlanMutation.mutate({ courseId, planId: plan.planId })
              }
              onSave={() => handleUpdatePlan(plan.planId)}
            />
          ))}
        </div>
      )}

      <div className="border-border-subtle mt-200 border-t pt-150">
        <h3 className="font-designer-16b text-text-default">새 플랜 만들기</h3>
        <PlanEditor
          form={createForm}
          isLocked={isMutating}
          title="신규 플랜"
          onChange={updateCreateFormField}
          onSave={handleCreatePlan}
        />
      </div>
    </div>
  );
}

function PlanEditor({
  form,
  isLocked,
  title,
  planCode,
  onChange,
  onDeactivate,
  onSave,
}: {
  form: PlanFormValues;
  isLocked: boolean;
  title: string;
  planCode?: string;
  onChange: <FieldName extends keyof PlanFormValues>(
    field: FieldName,
    value: PlanFormValues[FieldName],
  ) => void;
  onDeactivate?: () => void;
  onSave: () => void;
}) {
  return (
    <div className="border-border-default rounded-150 border p-150">
      <div className="mb-125 flex items-center justify-between gap-100">
        <div className="flex items-baseline gap-75">
          <h3 className="font-designer-16b text-text-default">{title}</h3>
          {planCode && (
            <span className="font-designer-11r text-text-subtlest">
              코드 {planCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-75">
          {onDeactivate && (
            <>
              <p className="font-designer-12r text-text-subtle">
                신규 결제에서 제외되며 기존 결제에는 영향이 없습니다.
              </p>
              <Button
                color="outlined"
                size="xsmall"
                disabled={isLocked || form.isActive === 'false'}
                onClick={onDeactivate}
              >
                비활성화
              </Button>
            </>
          )}
          <Button size="xsmall" disabled={isLocked} onClick={onSave}>
            저장
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-100">
        <PlanInput
          disabled={isLocked}
          label="플랜명"
          value={form.name}
          onChange={(value) => onChange('name', value)}
        />
        <PlanInput
          disabled={isLocked}
          label="부제"
          value={form.subtitle}
          onChange={(value) => onChange('subtitle', value)}
        />
        <div className="col-span-2">
          <PlanInput
            disabled={isLocked}
            label="설명"
            value={form.description}
            onChange={(value) => onChange('description', value)}
          />
        </div>
        <PlanInput
          disabled={isLocked}
          label="정가 (원)"
          type="number"
          value={form.regularPrice}
          onChange={(value) => onChange('regularPrice', value)}
        />
        <label className="font-designer-13m text-text-subtle flex flex-col gap-50">
          노출 위치
          <NativeSelect
            disabled={isLocked}
            value={form.isRecommended}
            onChange={(event) =>
              onChange('isRecommended', event.target.value as 'true' | 'false')
            }
          >
            <option value="true">대표 플랜(강조 노출)</option>
            <option value="false">일반 플랜</option>
          </NativeSelect>
        </label>
        <label className="font-designer-13m text-text-subtle flex flex-col gap-50">
          판매 상태
          <NativeSelect
            disabled={isLocked}
            value={form.isActive}
            onChange={(event) =>
              onChange('isActive', event.target.value as 'true' | 'false')
            }
          >
            <option value="true">판매중(활성)</option>
            <option value="false">판매중지(비활성)</option>
          </NativeSelect>
        </label>
      </div>

      {/* 얼리버드 */}
      <div className="border-border-subtle mt-125 rounded-100 border p-125">
        <label className="flex cursor-pointer items-center gap-100">
          <input
            type="checkbox"
            disabled={isLocked}
            checked={form.useEarlyBird}
            onChange={(event) => onChange('useEarlyBird', event.target.checked)}
            className="size-300 rounded-50 accent-rose-500"
          />
          <span className="font-designer-13m text-text-default">
            얼리버드 할인 사용
          </span>
        </label>
        {form.useEarlyBird ? (
          <div className="mt-100 grid grid-cols-2 gap-100">
            <PlanInput
              disabled={isLocked}
              label="얼리버드 할인가 (원)"
              type="number"
              value={form.discountPrice}
              onChange={(value) => onChange('discountPrice', value)}
            />
            <PlanInput
              disabled={isLocked}
              label="얼리버드 종료 (선택)"
              type="datetime-local"
              value={form.earlyBirdEndsAt}
              onChange={(value) => onChange('earlyBirdEndsAt', value)}
            />
          </div>
        ) : (
          <p className="font-designer-12r text-text-subtlest mt-75">
            끄면 정가로 판매되고, 고객 화면에 할인 표시가 나오지 않습니다.
          </p>
        )}
      </div>

      <PlanItemsEditor
        disabled={isLocked}
        items={form.items}
        onChange={(items) => onChange('items', items)}
      />
    </div>
  );
}

function PlanItemsEditor({
  disabled,
  items,
  onChange,
}: {
  disabled: boolean;
  items: PlanItemFormValue[];
  onChange: (items: PlanItemFormValue[]) => void;
}) {
  const updateLabel = (index: number, label: string) => {
    onChange(
      items.map((item, itemIndex) => (itemIndex === index ? { label } : item)),
    );
  };

  const addItem = () => {
    onChange([...items, { label: '' }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="mt-150 flex flex-col gap-75">
      <div className="flex items-center justify-between gap-100">
        <div className="flex flex-col">
          <p className="font-designer-13m text-text-subtle">
            플랜 포함 혜택(구성 항목)
          </p>
          <p className="font-designer-11r text-text-subtlest">
            고객 결제 카드에 위에서부터 순서대로 표시돼요.
          </p>
        </div>
        <Button
          color="outlined"
          size="xsmall"
          disabled={disabled}
          icon={<Plus />}
          onClick={addItem}
        >
          혜택 추가
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border-border-default rounded-100 border px-100 py-125">
          <p className="font-designer-13r text-text-subtle">
            아직 추가한 혜택이 없습니다. “혜택 추가”로 항목을 넣어주세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-75">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-75">
              <div className="flex flex-col">
                <Button
                  aria-label="위로 이동"
                  color="outlined"
                  size="xsmall"
                  disabled={disabled || index === 0}
                  icon={<ArrowUp />}
                  onClick={() => moveItem(index, -1)}
                />
                <Button
                  aria-label="아래로 이동"
                  color="outlined"
                  size="xsmall"
                  disabled={disabled || index === items.length - 1}
                  icon={<ArrowDown />}
                  onClick={() => moveItem(index, 1)}
                />
              </div>
              <div className="flex-1">
                <BaseInput
                  disabled={disabled}
                  size="m"
                  value={item.label}
                  placeholder="예: 전체 레슨 무제한 수강"
                  onValueChange={(value) => updateLabel(index, value)}
                />
              </div>
              <Button
                aria-label="혜택 제거"
                color="outlined"
                size="xsmall"
                disabled={disabled}
                icon={<Trash2 />}
                onClick={() => removeItem(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanInput({
  disabled,
  label,
  type = 'text',
  value,
  onChange,
}: {
  disabled: boolean;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="font-designer-13m text-text-subtle flex flex-col gap-50">
      {label}
      <BaseInput
        disabled={disabled}
        size="m"
        type={type}
        value={value}
        onValueChange={onChange}
      />
    </label>
  );
}
