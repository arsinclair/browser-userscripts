import { initLabelAutofill } from "./label-autofill";

const MILIEU_MUSIC_DIGITAL_MBID = "51e69c25-113c-4052-b430-837f9eebb3ac";

export function initMilieuMusicAutofill(): void {
    initLabelAutofill({
        annotationPattern: /\bMilieu\s+Music\b/iu,
        catalogNumberPattern: /\bMilieu\s+Music\s+number\s+([^\s,.;:!?()[\]{}]+)/iu,
        defaultLabelId: MILIEU_MUSIC_DIGITAL_MBID,
        labels: [
            { id: "30166e7a-d7ca-4b32-9e22-2228958db577", names: ["Milieu Music"] },
            { id: MILIEU_MUSIC_DIGITAL_MBID, names: ["Milieu Music Digital"] }
        ]
    });
    initLabelAutofill({
        annotationPattern: /\bPsoma\s+Psi\s+Phi\b/iu,
        catalogNumberPattern: /\bPsoma\s+Psi\s+Phi\s+number\s+([^\s,.;:!?()[\]{}]+)/iu,
        defaultLabelId: "2c44071a-be42-4dba-9d76-f1ce5a11157e",
        labels: [{ id: "2c44071a-be42-4dba-9d76-f1ce5a11157e", names: ["Psøma Psi Phi"] }]
    });
}
