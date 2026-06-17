export interface BreedMetadata {
  description?  : string;
  temperament?  : string;
  size?         : string;
  origin?       : string;
  lifespan?     : string;
  energy_level? : string;
  shedding?     : string;
  fun_fact?     : string;
}

export interface Prediction {
  breed            : string;
  probability      : number;
  classifier_score?: number;
  similarity_score?: number;
  metadata?        : BreedMetadata | null;
}

export interface PredictionResult {
  predictions       : Prediction[];
  mixed_breed_likely: boolean;
  confidence        : "high" | "medium" | "low";
  label?            : string;
  dog_detected?     : boolean;
  image_quality?    : string;
  quality_warnings? : string[];
  inference_time_ms : number;
  model_version     : string;
  explanation?      : string;
}

export type Mode = "upload" | "camera";
