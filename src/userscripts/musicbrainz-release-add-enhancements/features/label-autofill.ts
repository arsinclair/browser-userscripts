import { setInputValue } from "../utils/input";

export interface LabelDefinition {
    id: string;
    names: readonly string[];
}

export interface LabelAutofillOptions {
    annotationPattern: RegExp;
    catalogNumberPattern: RegExp;
    defaultLabelId: string;
    labels: readonly LabelDefinition[];
}

interface AddedLabel {
    catalogNumberInput: HTMLInputElement;
    row: HTMLTableRowElement;
}

function executePattern(pattern: RegExp, value: string): RegExpExecArray | null {
    pattern.lastIndex = 0;
    return pattern.exec(value);
}

function labelIdForValue(value: string, labels: readonly LabelDefinition[]): string | undefined {
    const normalizedValue = value.toLowerCase();

    for (const label of labels) {
        if (
            value === label.id ||
            label.names.some(name => name.toLowerCase() === normalizedValue)
        ) {
            return label.id;
        }
    }

    return undefined;
}

function findLabel(options: LabelAutofillOptions): AddedLabel | undefined {
    const labelInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[id^="label-"]')
    );
    let labelInput: HTMLInputElement | undefined;
    let labelId: string | undefined;

    for (const input of labelInputs) {
        const matchingLabelId = labelIdForValue(input.value.trim(), options.labels);
        if (matchingLabelId) {
            labelInput = input;
            labelId = matchingLabelId;
            break;
        }
    }

    if (!labelInput) {
        labelInput = labelInputs.find(input => !input.value.trim());
        labelId = options.defaultLabelId;
    }

    if (!labelInput || !labelId) {
        return undefined;
    }

    const row = labelInput.closest<HTMLTableRowElement>("tr");
    const catalogNumberInput = row?.querySelector<HTMLInputElement>('input[id^="catno-"]');
    if (!row || !catalogNumberInput) {
        return undefined;
    }

    if (labelInput.value.trim() !== labelId) {
        setInputValue(labelInput, labelId);
    }

    return { catalogNumberInput, row };
}

export function initLabelAutofill(options: LabelAutofillOptions): void {
    const annotationInput = document.querySelector<HTMLTextAreaElement>("#annotation");
    if (!annotationInput) {
        return;
    }

    let addedLabel: AddedLabel | undefined;

    const stopWatching = (): void => {
        annotationInput.removeEventListener("input", update);
    };

    const update = (): void => {
        const annotation = annotationInput.value;
        if (!annotation || !executePattern(options.annotationPattern, annotation)) {
            return;
        }

        if (!addedLabel?.row.isConnected) {
            addedLabel = findLabel(options);
            if (!addedLabel) {
                return;
            }
        }

        const catalogNumber = executePattern(options.catalogNumberPattern, annotation)?.[1]?.trim();
        if (!catalogNumber) {
            return;
        }

        if (!addedLabel.catalogNumberInput.value.trim()) {
            setInputValue(addedLabel.catalogNumberInput, catalogNumber);
        }
        stopWatching();
    };

    annotationInput.addEventListener("input", update);
    update();
}
