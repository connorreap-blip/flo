import type { CanvasViewport, Card, Edge } from "../types";
import { bugTriageTemplate } from "./bug-triage";
import { featureImplementationTemplate } from "./feature-implementation";
import { productDiscoveryTemplate } from "./product-discovery";
import { sampleWorkspaceTemplate } from "./sample-workspace";
import { systemArchitectureTemplate } from "./system-architecture";

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  cards: Card[];
  edges: Edge[];
  viewport: CanvasViewport;
  goal: string;
}

export {
  bugTriageTemplate,
  featureImplementationTemplate,
  productDiscoveryTemplate,
  sampleWorkspaceTemplate,
  systemArchitectureTemplate,
};

export const starterTemplates: WorkspaceTemplate[] = [
  featureImplementationTemplate,
  systemArchitectureTemplate,
  bugTriageTemplate,
  productDiscoveryTemplate,
];

export const workspaceTemplates: WorkspaceTemplate[] = [sampleWorkspaceTemplate, ...starterTemplates];

export function getWorkspaceTemplateById(id: string): WorkspaceTemplate | undefined {
  return workspaceTemplates.find((template) => template.id === id);
}
