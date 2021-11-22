import React, { useEffect, useRef, useState } from 'react';
import './App.css';

type LiquidList = {
    [key: string]: {
        name: string,
        amount: number
    }
}

type SolidList = {
    [key: string]: {
        name: string,
        displacement: number,
        amount: number
    }
}

function stateFromLocationHash() {
    let state = null
    let text = document.location.hash.substr(1)
    let hash = decodeURIComponent(text)

    try {
        state = JSON.parse(hash)
    } catch(e) {
        console.error(e)
    }
    
    if(state === null) {
        state = {
            tinyurl: text,
            uid: 0,
            volume: 0,
            volumeUnits: "mL",
            massUnits: "g",
            liquids: {},
            solids: {}
        }
    }

    console.log(state)

    return state
}

function App() {
    console.log("App()")

    let hashState = stateFromLocationHash()

    let solidNameRef = useRef<HTMLInputElement>(null)
    let solidDisplacementRef = useRef<HTMLInputElement>(null)

    let [volume, setVolume] = useState(hashState.volume as number)
    let [volumeUnits, setVolumeUnits] = useState(hashState.volumeUnits as string)
    let [massUnits, setMassUnits] = useState(hashState.massUnits as string)
    let [uid, setUid] = useState(hashState.uid as number)
    let [liquids, setLiquids] = useState(hashState.liquids as LiquidList)
    let [solids, setSolids] = useState(hashState.solids as SolidList)
    let [knownSolids, setKnownSolids] = useState({} as {[key: string]: number})
    let [tinyurl] = useState(hashState.tinyurl as string)

    document.location.hash = encodeURIComponent(JSON.stringify({tinyurl, uid, volume, volumeUnits, massUnits, liquids, solids}))

    useEffect(() => {
        let controller = new AbortController()

        async function get() {
            let knownSolidsReq = await fetch(`https://tinyurl.com/${tinyurl}`, {signal: controller.signal})
            let json = await knownSolidsReq.json()
            setKnownSolids(prevValue => json)
        }

        if(Object.keys(knownSolids).length === 0) {
            get().catch((err) => {
                console.error(err)
            })
        }

        return () => {
            controller.abort()
        }
    })

    let addLiquid = () => {
        setUid(uid + 1)

        liquids[uid] = {
            name: "",
            amount: NaN
        }

        setLiquids(liquids)
    }

    let removeLiquid = (uid: string) => {
        delete liquids[uid]
        setLiquids({...liquids})
    }

    let onLiquidNameChange = (uid: string, value: string) => {
        setLiquids({
            ...liquids,
            [uid]: {
                ...liquids[uid],
                name: value
            }
        })
    }

    let onLiquidAmountChange = (uid: string, value: number) => {
        setLiquids({
            ...liquids,
            [uid]: {
                ...liquids[uid],
                amount: value
            }
        })
    }

    let addSolid = () => {
        setUid(uid + 1)

        solids[uid] = {
            name: "",
            displacement: NaN,
            amount: NaN
        }

        setSolids(solids)
    }

    let removeSolid = (uid: string) => {
        delete solids[uid]
        setSolids({...solids})
    }

    let onSolidNameChange = (uid: string, value: string) => {
        setSolids(prevState =>  ({
            ...prevState,
            [uid]: {
                ...prevState[uid],
                name: value
            }
        }))
    }

    let onSolidDisplacementChange = (uid: string, value: number) => {
        setSolids(prevState => ({
            ...prevState,
            [uid]: {
                ...prevState[uid],
                displacement: value
            }
        }))
    }

    let onSolidAmountChange = (uid: string, value: number) => {
        setSolids({
            ...solids,
            [uid]: {
                ...solids[uid],
                amount: value
            }
        })
    }

    let liquidsList = Object.entries(liquids).map(([key, value]) =>
        <li key={key}>
            <button onClick={() => removeLiquid(key)}>Remove</button>
            <br/>
            <label htmlFor={`name_${key}`}>Name</label>
            <br/>
            <input onChange={(e) => onLiquidNameChange(key, e.target.value)} defaultValue={value.name} id={`name_${key}`} type="text"/>
            <br/>

            <label htmlFor={`amount_${key}`}>Volume (%)</label>
            <br/>
            <input onChange={(e) => onLiquidAmountChange(key, e.target.valueAsNumber)} defaultValue={value.amount || ""} id={`amount_${key}`} type="number"/>
            <br/>
        </li>
    )

    let knownSolidsOptions = Object.entries(knownSolids).map(([key, value]) =>
        <option key={key} value={key}>{key}</option>
    )

    let onKnownSolidChange = (uid: string, value: string) => {
        solidNameRef.current!.value = value
        solidDisplacementRef.current!.valueAsNumber = knownSolids[value]
        onSolidNameChange(uid, value)
        onSolidDisplacementChange(uid, knownSolids[value])
    }

    let solidsList = Object.entries(solids).map(([key, value]) =>
        <li key={key}>
            <button onClick={() => removeSolid(key)}>Remove</button>
            <br/>

            <label htmlFor={`name_${key}`}>Name</label>
            <br/>
            <span style={{display: (Object.keys(knownSolids).length !== null) ? "default" : "none"}}>
            <select onChange={(e) => onKnownSolidChange(key, e.target.value)} value={value.name}>{knownSolidsOptions}</select>
            <br/>
            </span>
            <input onChange={(e) => onSolidNameChange(key, e.target.value)} value={value.name} id={`name_${key}`} type="text" ref={solidNameRef}/>
            <br/>

            <label htmlFor={`displacement_${key}`}>Displacement ({volumeUnits}/{massUnits})</label>
            <br/>
            <input onChange={(e) => onSolidDisplacementChange(key, e.target.valueAsNumber)} defaultValue={value.displacement || ""} id={`displacement_${key}`} type="number" ref={solidDisplacementRef}/>
            <br/>

            <label htmlFor={`amount_${key}`}>Concentration ({massUnits}/{volumeUnits})</label>
            <br/>
            <input onChange={(e) => onSolidAmountChange(key, e.target.valueAsNumber)} defaultValue={value.amount || ""} id={`amount_${key}`} type="number"/>
            <br/>
        </li>
    )

    let recipeList = () => {
        let list: any = []
        let liquidsList = Object.values(liquids)
        let solidsList = Object.values(solids)

        if(!Number.isFinite(volume) || liquidsList.length === 0 || solidsList.length === 0) {
            return list
        }

        let liquidsBalance = liquidsList.filter(x => !Number.isFinite(x.amount))
        let liquidsPercentage = liquidsList.filter(x => Number.isFinite(x.amount))
        let solidsDisplacement = solidsList.map(x => x.amount * volume * x.displacement).reduce((p, c) => p + c, 0)
        let liquidsPercentageDisplacement = liquidsPercentage.map(x => (x.amount / 100) * volume).reduce((p, c) => p + c, 0)
        let remainder = volume - (solidsDisplacement + liquidsPercentageDisplacement)

        let id = 0

        liquidsBalance.forEach(x => list.push(<li key={id++}>{x.name}: {(remainder / liquidsBalance.length).toPrecision(4)} {volumeUnits}</li>))
        liquidsPercentage.forEach(x => list.push(<li key={id++}>{x.name}: {(volume * (x.amount / 100)).toPrecision(4)} {volumeUnits}</li>))
        solidsList.forEach(x => list.push(<li key={id++}>{x.name}: {(volume * x.amount).toPrecision(4)} {massUnits}</li>))

        return list
    }

    return (
        <div className="App">
            <h1>Recipe Calculator</h1>

            <label htmlFor="volumeUnits">Volume Units</label><br/>
            <input onChange={(e) => setVolumeUnits(e.target.value)} defaultValue={volumeUnits} id="volumeUnits" type="text"/><br/>

            <label htmlFor="massUnits">Mass Units</label><br/>
            <input onChange={(e) => setMassUnits(e.target.value)} defaultValue={massUnits} id="massUnits" type="text"/><br/>

            <label htmlFor="total">Total Volume ({volumeUnits})</label><br/>
            <input onChange={(e) => setVolume(e.target.valueAsNumber)} defaultValue={volume || ""} id="total" type="number"/><br/>

            <h2>Liquids</h2>
            <h3>Liquids without amount specified will be used to fill remainder of total volume</h3>
            <button onClick={addLiquid}>Add</button>
            <ul>{liquidsList}</ul>

            <h2>Solids</h2>
            <button onClick={addSolid}>Add</button>
            <ul>{solidsList}</ul>

            <h2>Recipe</h2>
            <ul>{recipeList()}</ul>
        </div>
    );
}

export default App;
