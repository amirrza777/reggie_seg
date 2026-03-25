import {
  CharacterCount,
  ModuleGuidanceTextFields,
  type ModuleGuidanceTextFieldsProps,
} from "@/features/modules/components/ModuleGuidanceTextFields";

export type EnterpriseModuleEditFieldsProps = ModuleGuidanceTextFieldsProps;

export function EnterpriseModuleEditFields(props: EnterpriseModuleEditFieldsProps) {
  return <ModuleGuidanceTextFields {...props} />;
}

export { CharacterCount };
