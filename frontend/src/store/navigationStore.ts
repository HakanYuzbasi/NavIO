/**
 * Zustand store for navigation state management.
 *
 * Centralizes all navigation-related state to avoid prop drilling
 * and enable easy state sharing across components.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import api from '../services/api';
import {
  FloorPlanWithGraph,
  RouteResponse,
  RoutePreferences,
  POI,
  Node,
} from '../types';

interface NavigationState {
  // Floor plan state
  floorPlans: FloorPlanWithGraph[];
  selectedFloorPlan: FloorPlanWithGraph | null;
  isLoadingFloorPlans: boolean;

  // Route state
  route: RouteResponse | null;
  isCalculatingRoute: boolean;
  routePreferences: RoutePreferences;

  // Selection state
  selectedPOI: POI | null;
  selectedStartNode: Node | null;
  selectedEndNode: Node | null;

  // UI state
  error: string | null;
  showAdminPanel: boolean;

  // Display settings
  showNodes: boolean;
  showEdges: boolean;
  showPOIs: boolean;

  // Actions
  loadFloorPlans: () => Promise<void>;
  selectFloorPlan: (floorPlanId: string) => Promise<void>;
  calculateRoute: (startNodeId: string, endNodeId: string) => Promise<void>;
  clearRoute: () => void;
  setRoutePreferences: (preferences: Partial<RoutePreferences>) => void;
  selectPOI: (poi: POI | null) => void;
  selectStartNode: (node: Node | null) => void;
  selectEndNode: (node: Node | null) => void;
  setShowAdminPanel: (show: boolean) => void;
  setError: (error: string | null) => void;
  toggleNodes: () => void;
  toggleEdges: () => void;
  togglePOIs: () => void;
  refreshCurrentFloorPlan: () => Promise<void>;
}

export const useNavigationStore = create<NavigationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      floorPlans: [],
      selectedFloorPlan: null,
      isLoadingFloorPlans: false,

      route: null,
      isCalculatingRoute: false,
      routePreferences: {
        accessible_only: false,
        avoid_stairs: false,
        shortest_distance: true,
      },

      selectedPOI: null,
      selectedStartNode: null,
      selectedEndNode: null,

      error: null,
      showAdminPanel: false,

      showNodes: true,
      showEdges: true,
      showPOIs: true,

      // Actions
      loadFloorPlans: async () => {
        set({ isLoadingFloorPlans: true, error: null });

        try {
          const plans = await api.getFloorPlans();
          set({ floorPlans: plans as FloorPlanWithGraph[] });

          // Load first floor plan with full data
          if (plans.length > 0 && !get().selectedFloorPlan) {
            const fullPlan = await api.getFloorPlan(plans[0].id);
            set({ selectedFloorPlan: fullPlan });
          }
        } catch (err) {
          console.error('Failed to load floor plans:', err);
          set({ error: 'Failed to load floor plans. Please try again.' });
        } finally {
          set({ isLoadingFloorPlans: false });
        }
      },

      selectFloorPlan: async (floorPlanId: string) => {
        set({ isLoadingFloorPlans: true, error: null, route: null });

        try {
          const fullPlan = await api.getFloorPlan(floorPlanId);
          set({
            selectedFloorPlan: fullPlan,
            selectedPOI: null,
            selectedStartNode: null,
            selectedEndNode: null,
          });
        } catch (err) {
          console.error('Failed to load floor plan:', err);
          set({ error: 'Failed to load floor plan. Please try again.' });
        } finally {
          set({ isLoadingFloorPlans: false });
        }
      },

      calculateRoute: async (startNodeId: string, endNodeId: string) => {
        const { selectedFloorPlan, routePreferences } = get();
        if (!selectedFloorPlan) return;

        set({ isCalculatingRoute: true, error: null });

        try {
          const routeResponse = await api.calculateRoute({
            floor_plan_id: selectedFloorPlan.id,
            start_node_id: startNodeId,
            end_node_id: endNodeId,
            preferences: routePreferences,
          });

          set({ route: routeResponse });

          if (!routeResponse.success) {
            set({ error: routeResponse.error || 'Failed to calculate route' });
          }
        } catch (err) {
          console.error('Failed to calculate route:', err);
          set({ error: 'Failed to calculate route. Please try again.' });
        } finally {
          set({ isCalculatingRoute: false });
        }
      },

      clearRoute: () => {
        set({
          route: null,
          selectedStartNode: null,
          selectedEndNode: null,
        });
      },

      setRoutePreferences: (preferences: Partial<RoutePreferences>) => {
        set((state) => ({
          routePreferences: { ...state.routePreferences, ...preferences },
        }));
      },

      selectPOI: (poi: POI | null) => {
        set({ selectedPOI: poi });
      },

      selectStartNode: (node: Node | null) => {
        set({ selectedStartNode: node });
      },

      selectEndNode: (node: Node | null) => {
        set({ selectedEndNode: node });
      },

      setShowAdminPanel: (show: boolean) => {
        set({ showAdminPanel: show });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      toggleNodes: () => {
        set((state) => ({ showNodes: !state.showNodes }));
      },

      toggleEdges: () => {
        set((state) => ({ showEdges: !state.showEdges }));
      },

      togglePOIs: () => {
        set((state) => ({ showPOIs: !state.showPOIs }));
      },

      refreshCurrentFloorPlan: async () => {
        const { selectedFloorPlan } = get();
        if (selectedFloorPlan) {
          await get().selectFloorPlan(selectedFloorPlan.id);
        }
      },
    }),
    { name: 'navigation-store' }
  )
);

// Selector hooks for common state combinations
export const useFloorPlan = () =>
  useNavigationStore((state) => ({
    floorPlans: state.floorPlans,
    selectedFloorPlan: state.selectedFloorPlan,
    isLoading: state.isLoadingFloorPlans,
  }));

export const useRoute = () =>
  useNavigationStore((state) => ({
    route: state.route,
    isCalculating: state.isCalculatingRoute,
    preferences: state.routePreferences,
  }));

export const useDisplaySettings = () =>
  useNavigationStore((state) => ({
    showNodes: state.showNodes,
    showEdges: state.showEdges,
    showPOIs: state.showPOIs,
  }));
