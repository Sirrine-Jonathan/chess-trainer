import { type Square, type Color, type PieceSymbol } from "chess.js";
import { useRef, useEffect } from "react";
import { BasePiece } from "./pieces/BasePiece";
import { ChessSquare } from "./parts/square";
import Sidebar from "./parts/sidebar";
import { useGame } from "./state/game/useGame";
import { GameProvider } from "./state/game/useGame";
import { OptionsProvider } from "./state/options/provider";
import { useOptions } from "./state/options/useOptions";
import clsx from "clsx";
import BottomDrawer from "./parts/bottomDrawer";
import GameOver from "./parts/gameOver";
import { DisplayWrapper } from "./parts/displayWrapper";
import { useIsMobile } from "../hooks/useIsMobile";
import "./chessBoard.scss";
import {
  getGameType,
  getFen,
  getLevel,
  getColor,
  GameType,
  initType,
} from "./../utils";
import { SelectionProvider } from "./state/selection/provider";
import { WhiteCaptured, BlackCaptured } from "./parts/captured";
import { useSelection } from "./state/selection/useSelection";
import { botDelay } from "./state/game/useGame";
import ColorControls from "./parts/mobileControls";
import { LayerQuickControls } from "./parts/LayerQuickControls";
import History from "./parts/history";
import { PromotionPrompt } from "./parts/promotionPrompt";
import { Opening } from "./parts/opening";

export const ChessBoardInner = ({ loading }: { loading: boolean }) => {
  const { Options } = useOptions();
  const { Actions, gameState } = useGame();
  const { selectionState, selectionActions } = useSelection();
  const isMobile = useIsMobile();

  const chessBoardWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Actions.performUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run at start
  }, []);

  const computerIsMoving = useRef<boolean>(false);
  const timeoutHandle = useRef<ReturnType<typeof window.setTimeout>>();

  const turnRef = useRef<Color | null>(null);

  useEffect(() => {
    if (turnRef.current === gameState.turn) {
      return;
    }
    turnRef.current = gameState.turn;
    console.log("Turn", gameState.turn);
    if (
      gameState.turn !== gameState.playerColor &&
      computerIsMoving.current === false
    ) {
      console.log("Computer is moving");
      clearTimeout(timeoutHandle.current);
      timeoutHandle.current = setTimeout(async () => {
        Actions.computerMove().then(result => {
          if (result) {
            if (result.captured) {
              Actions.setColorCaptured({
                color: result.captured.color as Color,
                piece: result.captured.piece,
                type: result.captured.type as CaptureEvent["type"],
              });
            }
            Actions.setLastMove(result.move);
            selectionActions.setActivePiece(null);
          }
          Actions.performUpdate();
        });
      }, botDelay);
      computerIsMoving.current = true;
    } else {
      console.log("Waiting for player move");
      computerIsMoving.current = false;
    }
  }, [gameState.turn, gameState.playerColor, Actions, selectionActions]);

  return (
    <DisplayWrapper loading={loading}>
      <>
        <div
          ref={chessBoardWrapperRef}
          className="chessBoardWrapper"
          onClick={(e) => {
            if (e.target === chessBoardWrapperRef.current) {
              selectionActions.setActivePiece(null);
              Actions.setActiveMoves([]);
            }
          }}
        >
          <>
            {isMobile ? <Opening /> : null}
            {isMobile ? <ColorControls /> : null}
            <div className="outerBoardContainer">
              {(
                gameState.playerColor === "w"
                  ? Options.flipBoard
                  : !Options.flipBoard
              ) ? (
                <BlackCaptured isTop={true} />
              ) : (
                <WhiteCaptured isTop={true} />
              )}
              {!isMobile ? (
                <div className="files files-top">
                  {(() => {
                    const nonFlipped = "abcdefgh"
                      .split("")
                      .map((file) => <div className="file-name">{file}</div>);

                    if (
                      gameState.playerColor === "w"
                        ? Options.flipBoard
                        : !Options.flipBoard
                    ) {
                      return nonFlipped.reverse();
                    }

                    return nonFlipped;
                  })()}
                </div>
              ) : null}
              <div className="innerBoardContainer">
                {!isMobile ? (
                  <>
                    <div className="ranks ranks-left">
                      {(() => {
                        const nonFlipped = "12345678"
                          .split("")
                          .reverse()
                          .map((rank) => (
                            <div className="rank-name">{rank}</div>
                          ));

                        if (
                          gameState.playerColor === "w"
                            ? Options.flipBoard
                            : !Options.flipBoard
                        ) {
                          return nonFlipped.reverse();
                        }

                        return nonFlipped;
                      })()}
                    </div>
                    <div className="ranks ranks-right">
                      {(() => {
                        const nonFlipped = "12345678"
                          .split("")
                          .reverse()
                          .map((rank) => (
                            <div className="rank-name">{rank}</div>
                          ));

                        if (
                          gameState.playerColor === "w"
                            ? Options.flipBoard
                            : !Options.flipBoard
                        ) {
                          return nonFlipped.reverse();
                        }

                        return nonFlipped;
                      })()}
                    </div>
                  </>
                ) : null}
                {Actions.navRestored() ? <GameOver /> : null}
                <PromotionPrompt key={`promotion-at-${name}`} />
                <div
                  key={gameState.ascii}
                  className={clsx([
                    "board",
                    gameState.isGameOver && Actions.navRestored() && "blur",
                    (gameState.playerColor === "w"
                      ? Options.flipBoard
                      : !Options.flipBoard) && "flip",
                    !Actions.navRestored() && "navigating",
                  ])}
                  onKeyDown={(e) => {
                    if (e.code === "Escape") {
                      selectionActions.setActivePiece(null);
                      Actions.setActiveMoves([]);
                    }
                  }}
                >
                  {gameState.board.flat().map((piece, index) => {
                    const rank = ["a", "b", "c", "d", "e", "f", "g", "h"][
                      index % 8
                    ];
                    const fileNum = ((index - (index % 8)) % 9) - 1;
                    const file = fileNum < 0 ? 8 : fileNum;

                    const name = `${rank}${file}`;

                    const pieceCanMove = !!gameState.moves?.find((move) => {
                      return name === move.from;
                    });

                    const flip =
                      gameState.playerColor === "w"
                        ? Options.flipBoard
                        : !Options.flipBoard;

                    const enemyDefending = !!(
                      gameState.conflict &&
                      gameState.conflict[name as Square].black
                    );

                    const playerDefending = !!(
                      gameState.conflict &&
                      gameState.conflict[name as Square].white
                    );

                    const isPlayerAttackingTargeted =
                      ((playerDefending && gameState.playerColor === "w") ||
                        (enemyDefending && gameState.playerColor === "b")) &&
                      gameState.lockedDefense.some(
                        (move) => move.to === name || move.from === name
                      );

                    const isAttacked = !!(
                      piece &&
                      ((gameState.conflict &&
                        gameState.conflict[name as Square].white &&
                        piece.color !== "w") ||
                        (gameState.conflict &&
                          gameState.conflict[name as Square].black &&
                          piece.color !== "b"))
                    );

                    const partOfLastMove =
                      gameState.lastMove !== null &&
                      (name === gameState.lastMove.to ||
                        name === gameState.lastMove.from);

                    const possibleDestinationOfLocked = !!(
                      gameState.lockedMoves.find((move) => name === move.to) ||
                      gameState.lockedDefense.find((move) => name === move.to)
                    );

                    const possibleDestination = selectionState.activePiece
                      ? !!gameState.activeMoves?.find(
                        (move) => name === move.to
                      )
                      : false;

                    return (
                      <ChessSquare
                        key={name}
                        name={name as Square}
                        piece={piece}
                        flip={flip}
                        enemyDefending={enemyDefending}
                        playerDefending={playerDefending}
                        isPlayerAttackingTargeted={isPlayerAttackingTargeted}
                        isAttacked={isAttacked}
                        partOfLastMove={partOfLastMove}
                        possibleDestination={possibleDestination}
                        possibleDestinationOfLocked={
                          possibleDestinationOfLocked
                        }
                      >
                        {piece ? (
                          <BasePiece
                            type={piece.type as PieceSymbol}
                            color={piece.color as Color}
                            pieceCanMove={pieceCanMove}
                          />
                        ) : null}
                      </ChessSquare>
                    );
                  })}
                </div>
              </div>
              {!isMobile ? (
                <div className="files files-bottom">
                  {(() => {
                    const nonFlipped = "abcdefgh"
                      .split("")
                      .map((file) => <div className="file-name">{file}</div>);

                    if (
                      gameState.playerColor === "w"
                        ? Options.flipBoard
                        : !Options.flipBoard
                    ) {
                      return nonFlipped.reverse();
                    }

                    return nonFlipped;
                  })()}
                </div>
              ) : null}
              {(
                gameState.playerColor === "w"
                  ? Options.flipBoard
                  : !Options.flipBoard
              ) ? (
                <WhiteCaptured />
              ) : (
                <BlackCaptured />
              )}
            </div>
            {isMobile ? <LayerQuickControls /> : null}
            {isMobile ? <History /> : null}
          </>
        </div>
        {isMobile ? <BottomDrawer /> : <Sidebar />}
      </>
    </DisplayWrapper>
  );
};

const ChessBoardGame = () => {
  initType();
  const type = getGameType();
  const color = getColor();
  const level = type === GameType.Trainer ? -1 : getLevel();
  const fen = getFen();
  const { selectionState } = useSelection();

  return (
    <GameProvider
      lockedOwn={selectionState.lockedOwn}
      lockedTarget={selectionState.lockedTarget}
      fen={fen}
      color={color}
      type={type}
      level={level}
    >
      <ChessBoardInner loading={false} />
    </GameProvider>
  );
};

export const ChessBoard = () => {
  return (
    <OptionsProvider>
      <SelectionProvider>
        <ChessBoardGame />
      </SelectionProvider>
    </OptionsProvider>
  );
};
