/**
 * Register Module Index
 *
 * Central export point for domain/register structure and pragmatic competence.
 * Implements Gap 4.2: Domain/Register Structure.
 */

// Register Profile Types and Library
export {
  type Genre,
  type PragmaticFunction,
  type FormalityLevel,
  type CollocationPattern,
  type RegisterProfile,
  type RegisterFeatures,
  type DomainStructure,
  type DomainTransition,
  REGISTER_PROFILES,
  DOMAIN_STRUCTURES,
  getRegistersByFormality,
  getRegistersByGenre,
  findClosestRegister,
  getDomain,
  getRegistersForDomain,
  calculateFormalityDistance,
  isTypicalForRegister,
  getCollocationsInRegister,
} from './register-profile';

// Register Calculator
export {
  type RegisterFitResult,
  type WordRegisterDistribution,
  type RegisterTransferAnalysis,
  type TextRegisterAnalysis,
  RegisterCalculator,
  createRegisterCalculator,
  computeRegisterAppropriatenessScore,
  detectTextRegister,
} from './register-calculator';
