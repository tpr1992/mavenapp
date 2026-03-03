/// <reference types="vite/client" />

// Bridge @types/leaflet UMD declarations for moduleResolution: "bundler"
declare module "leaflet" {
    export = L
}

// leaflet.markercluster augments the L namespace
declare namespace L {
    interface MarkerClusterGroupOptions {
        maxClusterRadius?: number
        spiderfyOnMaxZoom?: boolean
        showCoverageOnHover?: boolean
        zoomToBoundsOnClick?: boolean
        iconCreateFunction?: (cluster: MarkerCluster) => DivIcon | Icon
    }

    interface MarkerCluster {
        getChildCount(): number
    }

    class MarkerClusterGroup extends FeatureGroup {
        constructor(options?: MarkerClusterGroupOptions)
    }

    function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup
}

declare module "leaflet.markercluster" {
    // Side-effect import — augments L namespace
}
