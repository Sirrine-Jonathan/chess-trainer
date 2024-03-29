import type { Square, PieceSymbol, Move, Color } from "chess.js";
import {
  useEffect,
  useRef,
  useReducer,
  createContext,
  type ReactNode,
} from "react";
import { useContext, useMemo, useCallback } from "react";
import { ActionTypeNames } from "./reducer";
import { useSelection } from "../selection/useSelection";
import { reducer } from "./reducer";
import { writeFen, GameType, loadFenForInfo } from "../../../utils";

import type { Dispatch } from "react";
import { DEFAULT_POSITION } from "chess.js";
import { ActionType } from "./reducer";
import { ChessLayersBot } from "../../../App";
import { Game } from "./game";

const game = new Game();

export const botDelay = 1000;

const pieceMapObject = {
  a8: "a8" as Square,
  b8: "b8" as Square,
  c8: "c8" as Square,
  d8: "d8" as Square,
  e8: "e8" as Square,
  f8: "f8" as Square,
  g8: "g8" as Square,
  h8: "h8" as Square,
  a7: "a7" as Square,
  b7: "b7" as Square,
  c7: "c7" as Square,
  d7: "d7" as Square,
  e7: "e7" as Square,
  f7: "f7" as Square,
  g7: "g7" as Square,
  h7: "h7" as Square,
  a6: null,
  b6: null,
  c6: null,
  d6: null,
  e6: null,
  f6: null,
  g6: null,
  h6: null,
  a5: null,
  b5: null,
  c5: null,
  d5: null,
  e5: null,
  f5: null,
  g5: null,
  h5: null,
  a4: null,
  b4: null,
  c4: null,
  d4: null,
  e4: null,
  f4: null,
  g4: null,
  h4: null,
  a3: null,
  b3: null,
  c3: null,
  d3: null,
  e3: null,
  f3: null,
  g3: null,
  h3: null,
  a2: "a2" as Square,
  b2: "b2" as Square,
  c2: "c2" as Square,
  d2: "d2" as Square,
  e2: "e2" as Square,
  f2: "f2" as Square,
  g2: "g2" as Square,
  h2: "h2" as Square,
  a1: "a1" as Square,
  b1: "b1" as Square,
  c1: "c1" as Square,
  d1: "d1" as Square,
  e1: "e1" as Square,
  f1: "f1" as Square,
  g1: "g1" as Square,
  h1: "h1" as Square,
};

export const getSurroundingSquares = (square: Square) => {
  const squares = Object.keys(pieceMapObject);
  const surroundingSquares: Square[] = [];
  const indexOfSquare = squares.indexOf(square);

  // adjacent rank
  if (indexOfSquare > 0) {
    surroundingSquares.push(squares[indexOfSquare - 1] as Square);
  }
  // adjacent rank
  if (indexOfSquare < 63) {
    surroundingSquares.push(squares[indexOfSquare + 1] as Square);
  }
  // adjacent file
  if (indexOfSquare % 8 > 0) {
    surroundingSquares.push(squares[indexOfSquare - 8] as Square);
  }
  // adjacent file
  if (indexOfSquare % 8 < 7) {
    surroundingSquares.push(squares[indexOfSquare + 8] as Square);
  }
  // diagonals
  if (indexOfSquare % 8 > 0 && indexOfSquare > 0) {
    surroundingSquares.push(squares[indexOfSquare - 9] as Square);
  }
  if (indexOfSquare % 8 > 0 && indexOfSquare < 63) {
    surroundingSquares.push(squares[indexOfSquare + 7] as Square);
  }
  if (indexOfSquare % 8 < 7 && indexOfSquare > 0) {
    surroundingSquares.push(squares[indexOfSquare - 7] as Square);
  }
  if (indexOfSquare % 8 < 7 && indexOfSquare < 63) {
    surroundingSquares.push(squares[indexOfSquare + 9] as Square);
  }

  // filter out falsy
  return surroundingSquares.filter((square) => Boolean(square));
};

export const initialState: GameState = {
  playerColor: "w",
  ascii: "",
  board: [],
  pieceMap: pieceMapObject,
  conflict: null,
  moves: [],
  lockedMoves: [],
  lockedDefense: [],
  turn: "w",
  inCheck: false,
  isCheckmate: false,
  isDraw: false,
  isInsufficientMaterial: false,
  isGameOver: false,
  isStalemate: false,
  isThreefoldRepetition: false,
  fen: DEFAULT_POSITION,
  history: [],
  whiteCaptured: [],
  blackCaptured: [],
  lastMove: null,
  activeMoves: [],
  skillLevel: -1, // 0 - 20, -1 is for trainer bot
  type: GameType.Trainer,
  navIndex: 0,
  promotion: null,
  opening: null
};

const GameContext = createContext<{
  gameState: GameState;
  dispatch: Dispatch<ActionType>;
}>({
  gameState: initialState,
  dispatch: () => null,
});

export const GameProvider = ({
  lockedOwn,
  lockedTarget,
  fen,
  color,
  level,
  children,
}: {
  lockedOwn: SelectionState["lockedOwn"];
  lockedTarget: SelectionState["lockedTarget"];
  fen: string;
  color: Color;
  type: GameType;
  level: number;
  children: ReactNode;
}) => {
  ChessLayersBot.setSkill(level);
  const needsLoading = useRef(true);

  if (needsLoading.current && fen) {
    game.load(fen);
    needsLoading.current = false;
  }

  const [gameState, dispatch] = useReducer(reducer, {
    ...initialState,
    playerColor: color,
    skillLevel: level,
    ...game.getUpdate(),
  });

  useEffect(() => {
    if (gameState.turn === gameState.playerColor) {
      const lockedSquares = lockedOwn.map((fromPiece) => {
        const foundEntry = Object.entries(gameState.pieceMap).find(
          ([square, piece]) => piece === fromPiece
        );
        if (foundEntry) {
          return foundEntry[0] as Square;
        }
      });
      const lockedMoves = gameState.moves.filter((move) =>
        lockedSquares.includes(move.from)
      );
      dispatch({
        type: ActionTypeNames.SetLockedMoves,
        payload: lockedMoves,
      });
    } else {
      const lockedSquares = lockedTarget.map((fromPiece) => {
        const foundEntry = Object.entries(gameState.pieceMap).find(
          ([square, piece]) => piece === fromPiece
        );
        if (foundEntry) {
          return foundEntry[0] as Square;
        }
      });
      const lockedMoves = gameState.moves.filter((move) =>
        lockedSquares.includes(move.from)
      );
      const piecesOnLockedSquares = lockedSquares.map((square) => {
        return gameState.board
          .flat()
          .find((piece) => piece && piece.square === square);
      });
      const kingSquare = piecesOnLockedSquares.find(
        (piece) => piece && piece.type === "k"
      );
      if (kingSquare) {
        const kingSurroundingSquares = getSurroundingSquares(kingSquare.square);
        // generate some moves from the king square to each place the king could go
        const kingMoves = kingSurroundingSquares.map((square) => {
          return {
            from: kingSquare.square,
            to: square,
          };
        });
        // filter out any that are both
        // - not present in the gameState.moves array
        // - don't have a piece on the move.to square that is of the same color as the king
        const lockedDefense = kingMoves.filter((move) => {
          const movePresent = gameState.moves.find(
            (move) => move.from === move.to && move.from === move.to
          );
          const movePiece = gameState.board
            .flat()
            .find((piece) => piece && piece.square === move.to);
          if (movePresent && movePiece) {
            return movePiece.color === kingSquare.color;
          }
          return true;
        }) as Move[];
        // add these pieces to the lockedMoves
        lockedMoves.push(...lockedDefense);
      }
      dispatch({
        type: ActionTypeNames.SetLockedDefense,
        payload: lockedMoves,
      });
    }
  }, [
    lockedOwn,
    gameState.pieceMap,
    gameState.moves,
    gameState.turn,
    gameState.board,
    gameState.playerColor,
    lockedTarget,
  ]);

  const contextValue = useMemo(
    () => ({ gameState, fen, dispatch }),
    [gameState, fen, dispatch]
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};

export const useGame = () => {
  const { gameState, dispatch } = useContext(GameContext);
  const { selectionState } = useSelection();

  const updatePieceMap = useCallback(
    (from: Square, to: Square) => {
      const pieceMap = { ...gameState.pieceMap } as Record<
        Square,
        Square | null
      >;
      pieceMap[to] = pieceMap[from];
      pieceMap[from] = null;
      dispatch({
        type: ActionTypeNames.UpdatePieceMap,
        payload: pieceMap,
      });
    },
    [dispatch, gameState.pieceMap]
  );

  const actions = useMemo(() => {
    return {
      move: (move: Pick<Move, "to" | "from">) => {
        const finalMove = { ...move } as {
          to: Square;
          from: Square;
          promotion: "n" | "b" | "r" | "q";
        };

        const fromPiece = gameState.board
          .flat()
          .find((place) => place && move.from === place.square);
        if (fromPiece?.type === "p") {
          const file = move.to.split("")[1];
          if (file === "8" || file === "1") {
            if (!finalMove.promotion) {
              dispatch({
                type: ActionTypeNames.SetPromotion, payload: finalMove,
              })
              return;
            } else {
              dispatch({
                type: ActionTypeNames.SetPromotion, payload: null
              })
            }
          }
        }
        updatePieceMap(move.from, move.to);
        const captured = game.move(finalMove);
        return captured;
      },
      computerMove: async () => {
        console.log("Computer move");
        const fen = game.getFen();
        let move = await ChessLayersBot.getMinMaxMove(fen, game)
        if (move) {
          updatePieceMap(move.from, move.to);
          const captured = game.move(move);
          return { captured, move };
        }
        return false;
      },
      performUpdate: () => {
        const update = game.getUpdate();
        writeFen(update.fen);
        dispatch({
          type: ActionTypeNames.PerformUpdate,
          payload: update,
        });
        fetch(`https://explorer.lichess.ovh/masters?fen=${update.fen}`)
          .then(data => data.json())
          .then(data => {
            dispatch({
              type: ActionTypeNames.SetOpening,
              payload: data?.opening?.name
            })
          })
      },
      setColorCaptured: (event: CaptureEvent) => {
        const { whiteCaptured, blackCaptured } = gameState;
        let capturedCopy =
          event.color === "w" ? [...whiteCaptured] : [...blackCaptured];
        capturedCopy = [...capturedCopy, event.piece];
        dispatch({
          type: ActionTypeNames.SetColorCaptured,
          payload: {
            color: event.color,
            captured: capturedCopy,
          },
        });
      },
      setLoadDetails: (details: {
        blackCaptured: PieceSymbol[];
        whiteCaptured: PieceSymbol[];
      }) => {
        dispatch({
          type: ActionTypeNames.SetCaptured,
          payload: details,
        });
      },
      setActiveMoves: (moves: Move[]) => {
        dispatch({
          type: ActionTypeNames.SetActiveMoves,
          payload: moves,
        });
      },
      setLastMove: (move: Pick<Move, "to" | "from">) => {
        dispatch({
          type: ActionTypeNames.SetLastMove,
          payload: move,
        });
      },
      findSquareOfPiece: (from: Square) => {
        const foundEntry = Object.entries(gameState.pieceMap).find(
          ([square, piece]) => piece === from
        );
        if (foundEntry) {
          return foundEntry[0] as Square;
        }
      },
      getNumberOfDefended: () => {
        const counts = {
          white: 0,
          black: 0,
        };
        Object.entries(gameState.conflict || {}).forEach(
          ([key, { white, black }]) => {
            if (white) {
              counts.white += 1;
            }
            if (black) {
              counts.black += 1;
            }
          }
        );
        return counts;
      },
      getPoints: () => {
        const pieceValues: Record<Exclude<PieceSymbol, "k">, number> = {
          b: 3,
          n: 3,
          p: 1,
          q: 9,
          r: 5,
        };

        let whitePoints = 0;
        gameState.whiteCaptured.forEach((curr) => {
          whitePoints += pieceValues[curr as Exclude<PieceSymbol, "k">];
        });

        let blackPoints = 0;
        gameState.blackCaptured.forEach((curr) => {
          blackPoints += pieceValues[curr as Exclude<PieceSymbol, "k">];
        });

        return {
          black: blackPoints,
          white: whitePoints,
        };
      },
      navRestored: () => {
        return gameState.navIndex === gameState.history.length - 1;
      },
      checkNav: (step: number) => {
        const nextNav = gameState.navIndex + step;
        return nextNav >= -1 && nextNav < gameState.history.length;
      },
      nav: (step: number) => {
        if (actions.checkNav(step)) {
          const nextNav = gameState.navIndex + step;
          const isBackward = gameState.navIndex - nextNav > 0;

          const move = isBackward
            ? gameState.history[gameState.navIndex]
            : gameState.history[gameState.navIndex + 1];
          const chessForInfo = loadFenForInfo(
            isBackward ? move.before : move.after
          );

          dispatch({
            type: ActionTypeNames.PerformUpdate,
            payload: { ...gameState, board: chessForInfo.board() },
          });
          dispatch({
            type: ActionTypeNames.SetNavIndex,
            payload: nextNav,
          });
        }
      },
      navTo: (index: number) => {
        const move = gameState.history[index];
        const chessForInfo = loadFenForInfo(move.before);
        dispatch({
          type: ActionTypeNames.PerformUpdate,
          payload: { ...gameState, board: chessForInfo.board() },
        });
        dispatch({
          type: ActionTypeNames.SetNavIndex,
          payload: index,
        });
      },
    };
  }, [gameState, dispatch, updatePieceMap]);

  const activeSquareRef = useRef(selectionState.activePiece?.from);

  useEffect(() => {
    const activeSquare = selectionState.activePiece?.from;
    if (activeSquare === activeSquareRef.current) {
      return;
    }
    activeSquareRef.current = activeSquare;
    const activeMoves = activeSquare ? game.getActiveMoves(activeSquare) : [];
    actions.setActiveMoves(activeMoves);
  }, [selectionState.activePiece, actions]);

  return { gameState, Actions: actions };
};
