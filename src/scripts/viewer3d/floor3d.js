import { EventDispatcher, TextureLoader, RepeatWrapping, MeshBasicMaterial, FrontSide, DoubleSide, Vector2, Vector3, Face3, Geometry, Shape, ShapeGeometry, Mesh } from 'three';
import { EVENT_CHANGED, EVENT_UPDATE_TEXTURES } from '../core/events.js';
import { Configuration, configWallHeight } from '../core/configuration.js';
import { BufferGeometry } from 'three/build/three.module';
import { FloorMaterial3D } from '../materials/FloorMaterial3D.js';

export class Floor3D extends EventDispatcher {
    constructor(scene, room, controls) {
        super();
        this.scene = scene;
        this.room = room;
        this.controls = controls;
        this.floorPlane = null;
        this.roofPlane = null;
        this.changedevent = this.redraw.bind(this);
        this.__materialChangedEvent = this.__updateTexturePack.bind(this);
        this.__updateReflectionsEvent = this.__updateReflections.bind(this);

        this.__floorMaterial3D = null;
        this.init();
        this.room.addEventListener(EVENT_CHANGED, this.changedevent);
        this.room.addEventListener(EVENT_UPDATE_TEXTURES, this.__materialChangedEvent);
        this.controls.addEventListener('change', this.__updateReflectionsEvent);
    }

    __updateReflections() {
        if (this.__floorMaterial3D && this.scene.enabled) {
            let floorSize = this.room.floorRectangleSize.clone();
            this.floorPlane.visible = false;
            this.__floorMaterial3D.envMapCamera.position.set(floorSize.x, 0, floorSize.y);
            this.__floorMaterial3D.envMapCamera.update(this.scene.renderer, this.scene);
            this.floorPlane.visible = true;
            this.__floorMaterial3D.needsUpdate = true;
        }
    }

    __updateTexturePack() {
        let floorSize = this.room.floorRectangleSize.clone();
        let texturePack = this.room.getTexture();
        if (!this.__floorMaterial3D) {
            this.__floorMaterial3D = new FloorMaterial3D({ color: texturePack.color, side: DoubleSide }, texturePack, this.scene);
        }
        this.__floorMaterial3D.textureMapPack = texturePack;
        // this.__floorMaterial3D.updateDimensions(floorSize.x, floorSize.y);
        this.__floorMaterial3D.dimensions = floorSize;
        this.scene.needsUpdate = true;
    }

    switchWireframe(flag) {
        this.floorPlane.visible = !flag;
        this.roofPlane.visible = !flag;
    }

    init() {
        this.__updateTexturePack();
        this.redraw();
    }

    redraw() {
        this.removeFromScene();
        this.floorPlane = this.buildFloor();
        this.roofPlane = this.buildRoofVaryingHeight();
        this.addToScene();
    }

    buildFloor() {
        let points = [];
        this.room.interiorCorners.forEach((corner) => {
            points.push(new Vector2(corner.x, corner.y));
        });
        let floorSize = this.room.floorRectangleSize.clone();
        let shape = new Shape(points);
        let geometry = new ShapeGeometry(shape);

        geometry.faceVertexUvs[0] = [];

        geometry.faces.forEach((face) => {
            let vertA = geometry.vertices[face.a];
            let vertB = geometry.vertices[face.b];
            let vertC = geometry.vertices[face.c];
            geometry.faceVertexUvs[0].push([vertexToUv(vertA), vertexToUv(vertB), vertexToUv(vertC)]);
        });

        function vertexToUv(vertex) {
            let x = vertex.x / floorSize.x;
            let y = vertex.y / floorSize.y;
            return new Vector2(x, y);
        }

        geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0];
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        geometry.uvsNeedUpdate = true;
        let useGeometry = new BufferGeometry().fromGeometry(geometry);
        // this.__floorMaterial3D.updateDimensions(floorSize.x, floorSize.y);
        this.__floorMaterial3D.dimensions = floorSize;
        this.__floorMaterial3D.envMapCamera.position.copy(new Vector3(floorSize.x, 0, floorSize.y));
        let floor = new Mesh(useGeometry, this.__floorMaterial3D);
        floor.rotation.set(Math.PI * 0.5, 0, 0);
        return floor;
    }

    buildRoofVaryingHeight() {
        // setup texture
        var roofMaterial = new MeshBasicMaterial({ side: FrontSide, color: 0xe5e5e5 });
        var geometry = new Geometry();

        this.room.corners.forEach((corner) => {
            var vertex = new Vector3(corner.x, corner.elevation, corner.y);
            geometry.vertices.push(vertex);
        });
        for (var i = 2; i < geometry.vertices.length; i++) {
            var face = new Face3(0, i - 1, i);
            geometry.faces.push(face);
        }
        var roof = new Mesh(geometry, roofMaterial);
        // roof.rotation.set(Math.PI / 2, 0, 0);
        // roof.position.y = Configuration.getNumericValue(configWallHeight);
        return roof;
    }


    buildRoofUniformHeight() {
        // setup texture
        var roofMaterial = new MeshBasicMaterial({ side: FrontSide, color: 0xe5e5e5 });
        var points = [];
        this.room.interiorCorners.forEach((corner) => {
            points.push(new Vector2(corner.x, corner.y));
        });
        var shape = new Shape(points);
        var geometry = new ShapeGeometry(shape);
        var roof = new Mesh(geometry, roofMaterial);
        roof.rotation.set(Math.PI / 2, 0, 0);
        roof.position.y = Configuration.getNumericValue(configWallHeight);
        return roof;
    }

    addToScene() {
        this.scene.add(this.floorPlane);
        this.scene.add(this.roofPlane);
        //scene.add(roofPlane);
        // hack so we can do intersect testing
        // this.scene.add(this.room.floorPlane);
        // this.scene.add(this.room.roofPlane);
    }

    removeFromScene() {
        this.scene.remove(this.floorPlane);
        this.scene.remove(this.roofPlane);
        // this.scene.remove(this.room.floorPlane);
        // this.scene.remove(this.room.roofPlane);
    }

    showRoof(flag) {
        console.log(flag);
        // this.roofPlane.visible = flag;
    }

    destroy() {
        this.room.removeEventListener(EVENT_CHANGED, this.changedevent);
        this.room.removeEventListener(EVENT_UPDATE_TEXTURES, this.__materialChangedEvent);
        this.controls.removeEventListener('change', this.__updateReflectionsEvent);
        this.removeFromScene();
    }
}