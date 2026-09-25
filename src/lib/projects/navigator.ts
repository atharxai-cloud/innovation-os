import type { InnovationStage } from "@/domain/innovation-stage";
import type { NextBestAction } from "@/domain/project";

type Question = {
  question: string;
  type: string;
  priority: number;
  status: string;
};

type Assumption = {
  statement: string;
  category: string;
  status: string;
};

export function deriveNextBestAction(input: {
  stage: InnovationStage;
  questions: Question[];
  assumptions: Assumption[];
}): NextBestAction {
  const openQuestions = input.questions
    .filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS")
    .sort((a, b) => a.priority - b.priority);

  const untested = input.assumptions.filter((item) => item.status === "UNTESTED");

  if (input.stage === "DISCOVERY" || input.stage === "PROBLEM_VALIDATION") {
    const primaryQuestion = openQuestions.find(
      (item) => item.type === "PROBLEM_VALIDATION",
    );

    if (primaryQuestion) {
      return {
        action: primaryQuestion.question,
        reason:
          "قبل البحث عن الحلول يجب إثبات أن المشكلة محددة وقابلة للقياس وأن أثرها حقيقي.",
        blockingIssue: "صلاحية المشكلة لم تُثبت بعد.",
        confidence: 0.92,
      };
    }

    if (untested.length > 0) {
      return {
        action: `اختبر الافتراض: ${untested[0].statement}`,
        reason:
          "المشروع ما زال يعتمد على افتراض أساسي غير مدعوم بدليل أو قرار.",
        blockingIssue: "يوجد افتراض غير مختبر.",
        confidence: 0.86,
      };
    }

    return {
      action: "انتقل إلى جمع الأدلة المرتبطة بالمشكلة.",
      reason:
        "تم تنظيم المشكلة ولا توجد أسئلة تحقق أولية مفتوحة ذات أولوية أعلى.",
      blockingIssue: null,
      confidence: 0.8,
    };
  }

  if (input.stage === "EVIDENCE") {
    return {
      action: "ابحث عن أدلة تثبت وجود المشكلة وآليتها وطريقة قياسها.",
      reason: "مرحلة Evidence تتطلب مصادر فعلية مرتبطة بادعاءات المشروع.",
      blockingIssue: "الأدلة المحفوظة لم تُقيّم بعد.",
      confidence: 0.9,
    };
  }

  if (input.stage === "PRIOR_ART") {
    return {
      action: "قارن أقرب الأعمال السابقة وحدد ما المشترك وما المختلف.",
      reason: "لا يمكن تعريف فجوة قابلة للدفاع عنها قبل فهم الحلول السابقة.",
      blockingIssue: "التميّز التقني غير مثبت.",
      confidence: 0.9,
    };
  }

  if (input.stage === "GAP_DEFINITION") {
    return {
      action: "صغ فجوة واحدة قابلة للتحقق واربطها بأدلة وأعمال سابقة.",
      reason: "الفجوة يجب أن تكون فرضية قابلة للتحقق وليست ادعاءً نهائيًا.",
      blockingIssue: "الفجوة ما زالت غير مثبتة.",
      confidence: 0.88,
    };
  }

  if (input.stage === "EXPERIMENT_DESIGN") {
    return {
      action: "حوّل الفجوة إلى فرضية وتجربة لها متغيرات وقياس ومعيار نجاح.",
      reason: "الهدف الآن الوصول إلى Experiment Ready وليس بناء النموذج الأولي.",
      blockingIssue: "تصميم التجربة غير مكتمل.",
      confidence: 0.9,
    };
  }

  return {
    action: "راجع التجربة النهائية قبل البدء بالتنفيذ الميداني.",
    reason: "المشروع وصل إلى Experiment Ready في نطاق MVP.",
    blockingIssue: null,
    confidence: 0.95,
  };
}
