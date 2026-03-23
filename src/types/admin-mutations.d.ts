import type { CharacteristicDataType } from "@/src/generated/prisma/enums";

type AnimalCharacteristicAssignmentInput = {
  characteristicId: string;
  selected: boolean;
  dataType: CharacteristicDataType;
  required: boolean;
  showInCard: boolean;
  displayOrder: number;
};

type AnimalCharacteristicMutationInput =
  | {
      characteristicId: string;
      valueText: string;
    }
  | {
      characteristicId: string;
      valueNumber: number;
    }
  | {
      characteristicId: string;
      valueDate: Date;
    }
  | {
      characteristicId: string;
      valueBoolean: boolean;
    }
  | {
      characteristicId: string;
      optionId: string;
    };

export type { AnimalCharacteristicAssignmentInput, AnimalCharacteristicMutationInput };
